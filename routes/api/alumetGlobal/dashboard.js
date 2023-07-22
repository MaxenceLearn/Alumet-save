const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', async (req, res) => {
    if (!req.connected) return res.redirect('/auth/signin');
    const filePath = path.join(__dirname, '../../../views/pages/dashboard.html');
    res.sendFile(filePath);
});

module.exports = router;