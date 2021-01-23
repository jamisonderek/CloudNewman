var express = require('express');
var router = express.Router();

router.post('/', async function(req, res, next) {
    res.redirect('https://github.com/jamisonderek/CloudNewman');
});

router.get('/', async function(req, res, next) {
    res.redirect('https://github.com/jamisonderek/CloudNewman');
});

module.exports = router;
