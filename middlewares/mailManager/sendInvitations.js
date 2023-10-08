const { sendMail } = require('../../routes/api/alumetGlobal/mailing');
const Account = require('../../models/account');
const Invitation = require('../../models/invitation');
const Alumet = require('../../models/alumet');
const flashCardSet = require('../../models/flashcardSet');

async function sendInvitations(req, res, type, reference) {
    try {
        if (typeof req.body.collaborators === 'string') req.body.collaborators = JSON.parse(req.body.collaborators);
        const collaborators = req.body.collaborators;
        console.log(collaborators);
        let owner = await Account.findById(req.user.id);
        for (const participant of collaborators) {
            let account = await Account.findOne({
                _id: { $ne: req.user.id },
                _id: participant,
            });
            let referenceDetails;
            if (type === 'flashcards') {
                console.log('flashcards', reference);
                referenceDetails = await flashCardSet.findById(reference);
            } else if (type === 'alumet') {
                referenceDetails = await Alumet.findById(reference);
            }
            console.log(referenceDetails);

            let invitationCheck = await Invitation.findOne({ to: participant, reference: reference });

            if (!account || invitationCheck || referenceDetails.collaborators.includes(participant)) {
                console.log('invitation already sent');
                continue;
            }
            const invitation = new Invitation({
                owner: req.user.id,
                to: participant,
                type: type,
                reference,
            });
            await invitation.save();
            sendMail(
                account.mail,
                'Invitation à un alumet',
                `Vous avez été invité à collaborer sur "${referenceDetails.title}" (${type}) en tant que collaborateur par ${owner.name} ${owner.lastname} (${owner.username}). Accepter ou refuser l'invitation en vous rendant sur votre tableau de bord. `
            );
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = sendInvitations;