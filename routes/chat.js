const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');
const upload = require('../client/S3Client.js');
const moment = require('moment');

let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });


// 채팅 리스트 페이지
router.get('/list', async (req, res) => {
    res.render('chatList.ejs', {user : req.user});
});

// 채팅 상세 페이지
router.get('/detail', async (req, res) => {
    const user = req.user;
    const partner = { id : req.query.partnerId, nickname : req.query.partnerNick};
    // console.log("나 : " + req.user._id)
    // console.log("상대 : " + req.query.partnerId + " " + req.query.partnerNick);
    res.render('chatDetail.ejs', {user : user, partner : partner});
});

module.exports = router;
