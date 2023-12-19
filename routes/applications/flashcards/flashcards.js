const express = require('express');
const router = express.Router();

const { default: mongoose } = require('mongoose');
const path = require('path');
const Flashcards = require('../../../models/flashcards');
const Alumet = require('../../../models/alumet');
const Account = require('../../../models/account');
const authorize = require('../../../middlewares/authentification/authorize');



router.get('/revise/sandbox/:flashcard', async (req, res) => {
    try {
        console.log('sandbox')
        if (mongoose.Types.ObjectId.isValid(req.params.flashcard) === false) return res.redirect('/404');
        const flashcardSet = await Alumet.findById(req.params.flashcard);
        if (!flashcardSet) return res.redirect('/404');
        const filePath = path.join(__dirname, '../../../views/pages/applications/flashcards/sandbox.html');
        res.sendFile(filePath);
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});

router.get('/revise/smart/:flashcard', async (req, res) => {
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.flashcard) === false) return res.redirect('/404');
        const flashcardSet = await Alumet.findById(req.params.flashcard);
        if (!flashcardSet) return res.redirect('/404');
        const filePath = path.join(__dirname, '../../../views/pages/applications/flashcards/smart.html');
        res.sendFile(filePath);
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});

router.get('/:flashcardSet/:revisionMethod/content', async (req, res) => {
    try {
        const flashcardSet = await Alumet.findById(req.params.flashcardSet);
        if (!flashcardSet) return res.redirect('/404');
        const owner = await Account.findById(flashcardSet.owner, 'username icon _id name lastname');
        const participants = [];
        const getParticipantInfo = async () => {
            for (const participant of flashcardSet.participants) {
                const participantUser = await Account.findById(participant.userId, 'username icon _id name lastname');
                participantUser ? participants.push({ ...participantUser._doc, status: participant.status }) : null;
            }
        };
        await getParticipantInfo();
        const isAdmin = req.user && (req.user._id.toString() === flashcardSet.owner.toString() || flashcardSet.participants.some(p => p.userId === req.user._id.toString() && [0, 1].includes(p.status)));
        const flashcardSetInfo = { ...flashcardSet.toObject(), flashcards: [], owner, participants, user_infos: null, admin: isAdmin };
        req.user ? flashcardSetInfo.user_infos = { username: req.user.username, icon: req.user.icon, name: req.user.name, lastname: req.user.lastname, id: req.user._id } : null;
        const flashcards = await Flashcards.find({ flashcardSetId: flashcardSet._id }).sort({ dateCreated: -1 });
        for (const flashcard of flashcards) {
            const userDatas = flashcard.userDatas.find((data) => data.userId === req.user?.id) || { userId: req.user?.id, status: 0, lastReview: Date.now(), nextReview: Date.now(), inRow: 0 };
            flashcardSetInfo.flashcards.push( { ...flashcard.toObject(), userDatas: userDatas } );
        }
        res.json(flashcardSetInfo);
    }
    catch (error) {
        console.log(error);
        res.json({ error });
    }
});

router.post('/:flashcardSet/check', authorize(''), async (req, res) => {
    try {
        const { flashcardSetId, flashcards } = req.body;
        const flashcardSet = await Alumet.findById(flashcardSetId);
        if (!flashcardSet) return res.json({ error: 'Flashcard not found' });
        const flashcardsData = [];
        for (let flashcard of flashcards) {
            let newFlashcard;
            if (flashcard._id && mongoose.Types.ObjectId.isValid(flashcard._id)) {
                newFlashcard = await Flashcards.findById(flashcard._id);
                if (!flashcard) return res.json({ error: 'Flashcard not found' });
                newFlashcard.question = flashcard.question;
                newFlashcard.answer = flashcard.answer;
            } else {
                newFlashcard = new Flashcards({
                    flashcardSetId: flashcardSetId,
                    question: flashcard.question,
                    answer: flashcard.answer,
                });
            }
            await newFlashcard.save();
            flashcardsData.push(newFlashcard);
        }
        res.json({ flashcards: flashcardsData });
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});

router.delete('/:flashcard/:flashcardId', authorize(''), async (req, res) => {
    try {
        const flashcard = await Flashcards.findById(req.params.flashcardId);
        if (!flashcard) return res.json({ error: 'Flashcard not found' });
        await flashcard.delete();
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});

function determineNextReview(inRowNumber) {
    const days = [1, 3, 5, 8, 13, 21, 34, 55];
    return inRowNumber < 8 ? Date.now() + 1000 * 60 * 60 * 24 * days[inRowNumber] : Date.now() + 1000 * 60 * 60 * 24 * days[7];
}
router.post('/:flashcardSet/:flashcardId/review', authorize(), async (req, res) => {
    try {
        const { flashcardId } = req.params;
        const { status, cardReview } = req.body;
        const flashcard = await Flashcards.findById(flashcardId);
        if (!flashcard) return res.json({ error: 'Flashcard not found' });
        let userDatas = flashcard.userDatas.find((data) => data.userId == req.user.id);
        !userDatas ? userDatas = { nextReview: Date.now(), inRow: 0 } : null;
        userDatas = {
            userId: req.user.id,
            status,
            lastReview: Date.now(),
            nextReview: cardReview ? determineNextReview(userDatas.inRow) : userDatas.nextReview,
            inRow: cardReview ? parseInt(userDatas.inRow + 1) : 0
        };
        flashcard.userDatas = flashcard.userDatas.filter((data) => data.userId !== req.user.id);
        flashcard.userDatas.push(userDatas);
        await flashcard.save();
        res.json({ userDatas: userDatas });
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});
router.post('/reset', async (req, res) => {
    try {
        const { flashcardSetId } = req.body;
        const flashcards = await Flashcards.find({ flashcardSetId });
        for (const flashcard of flashcards) {
            flashcard.userDatas = [];
            await flashcard.save();
        }
        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
}
);

module.exports = router;
