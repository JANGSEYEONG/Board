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

// 채팅방 연결 요청
router.get('/request', async (req, res) => {
    const user = req.user;
    const partner = { _id : req.query.partnerId, nickname : req.query.partnerNick};
    // console.log("나 : " + req.user._id)
    // console.log("상대 : " + req.query.partnerId + " " + req.query.partnerNick);

    // 1. db에 해당하는 채팅방이 있는지 확인한다. 게시물 당 채팅방이 생성되기 때문에, 게시물 당
    await db.collection('chatRoom').insertOne({
        member : [user._id, new ObjectId(partner._id)],
        date : moment().format("YYYY-MM-DD HH:mm:ss")
    });
    // 채팅방 목록 페이지로 이동
    return res.redirect('/chat/list');
    // 2-1. 채팅방이 있을 경우 해당 채팅방 상세 페이지로 연결한다

    // 2-2. 채팅방이 없을 경우 채팅방 생성 후 채팅 상세 페이지로 연결한다

    //res.render('chatDetail.ejs', {user : user, partner : partner});
});

// 채팅 리스트 페이지
router.get('/list', async(req, res)=>{
    const user = req.user;

    // member는 배열이지만 아래와 같이 쿼리를 짜도 잘 가져옴

    // 내가 포함된 채팅방 리스트 가져오기
    let result = await db.collection('chatRoom').find({ member : user._id }).toArray()
    console.log(result)
    res.render('chatList.ejs', {user : user, chatList : result})

});

// 채팅 상세 페이지
router.get('/detail/:id', async(req, res)=>{
    const user = req.user;
    const chatId = req.params.id;

    let result = await db.collection('chatRoom').findOne({
        _id : new ObjectId(chatId)
    });
    
    res.render('chatDetail.ejs', {user : user, result : result})

});

module.exports = router;
