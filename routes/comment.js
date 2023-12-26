const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');
const upload = require('../client/S3Client.js');
const moment = require('moment');
const Util = require('../scripts/util.js');

let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// 댓글 등록
router.post('/add', async(req, res, next)=>{
    try{
        const User = req.user;
        const commentInfo = req.body;

        if(Util.IsNullOrWhiteSpace(commentInfo.content)) return res.send('댓글이 비어있음');
        if(Util.IsNullOrWhiteSpace(commentInfo.parentPostId)) return res.send('비정상적인 댓글..');

        const data = {
            content : commentInfo.content,
            parentPostId : new ObjectId(commentInfo.parentPostId),
            writerId : new ObjectId(User._id),
            writer : User.usernick // 로그인 계정의 닉네임으로..
        };

        const result = await db.collection('comment').insertOne(data);
        
        // POST 요청 응답 시 이전페이지로 다시 이동
        return res.redirect('back');
    }catch(e){
        Log.Write('comment/add[post]', e, true);
        res.send('error: ' + e);
    }
});

// 댓글 수정
router.put('/edit/:id', async(req, res, next)=>{

});

// 댓글 삭제
router.delete('/delete', async(req, res, next)=>{

});

module.exports = router;
