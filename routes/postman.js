var express = require('express');
var router = express.Router();

router.post('/', async function(req, res, next) {
    res.redirect('https://www.postman.com/coolcats123/workspace/cloud-newman-me/overview');
});

router.get('/', async function(req, res, next) {
    res.redirect('https://www.postman.com/coolcats123/workspace/cloud-newman-me/overview');
});

module.exports = router;
