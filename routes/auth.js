const express = require('express');
const router = express.Router();
const path = require('path');
const Account = require('../models/account');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { saltKey } = require('../config.json');

router.get('/signin', async (req, res) => {
    const filePath = path.join(__dirname, '../views/pages/signin.html');
    res.sendFile(filePath);
});

router.get('/signup', async (req, res) => {
    const filePath = path.join(__dirname, '../views/pages/signup.html');
    res.sendFile(filePath);
});


router.post('/signin', (req, res) => {
    console.log(req.body);
    Account.findOne({
        mail: req.body.mail
    })
    .then(user => {
        if (!user) {
            return res.status(401).json({
                error: 'Utilisateur non trouvé !'
            });
        }
        bcrypt.compare(req.body.password, user.password)
            .then(valid => {
                if (!valid) {
                    return res.status(400).json({
                        error: 'Mot de passe incorrect !'
                    });
                }
                const token = jwt.sign({
                        userId: user._id,
                        mail: user.mail
                    },
                    'TOKEN', {
                        expiresIn: '24h'
                    }
                )
                res.cookie('token', token).status(200).json({
                    message: 'Connexion réussie !'
                });
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({
                  error
                });
              });
    })
    .catch(error => {
        console.log(error);
        res.status(500).json({
          error
        });
      });
});


router.post('/signup', async (req, res) => {
    console.log(req.body);
    const account = new Account({
        nom: req.body.nom,
        prenom: req.body.prenom,
        mail: req.body.email,
        password: req.body.password
    });
    try {
        const hash = await bcrypt.hash(account.password, 10);
        account.password = hash;
        const newAccount = await account.save();
        res.status(201).json(newAccount);
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err });
    }
});


module.exports = router;