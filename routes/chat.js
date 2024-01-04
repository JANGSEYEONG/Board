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
    try {
        const user = req.user;
        const partner = { _id: req.query.partnerId, nickname: req.query.partnerNick };
        // console.log("나 : " + req.user._id)
        // console.log("상대 : " + req.query.partnerId + " " + req.query.partnerNick);

        // 1. db에 해당하는 채팅방이 있는지 확인한다.
        // 채팅방 생성 기준 : 멤버에 나와 상대가 있는 채팅방이 있는지 조회
        const findQuery = {
            $or:[{member:[new ObjectId(partner._id), user._id]},{member:[user._id,new ObjectId(partner._id)]}]
        };
        const result = await db.collection('chatRoom').find(findQuery).toArray();
        let chatRoomId = null;
        console.log(result);
        if(result.length === 0){
            // 1-1. 채팅방이 없을 경우 채팅방 생성 후 채팅 상세 페이지로 연결한다
            console.log('채팅방 없음')
            let result2 = await db.collection('chatRoom').insertOne({
                member: [user._id, new ObjectId(partner._id)],
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
            });
            chatRoomId = result2.insertedId;

        }else{
            // 1-2. 채팅방이 있을 경우 해당 채팅방 상세 페이지로 연결한다
            chatRoomId = result[0]._id;
            console.log('채팅방 잇음')
        }
        console.log('chatRoomId :' + chatRoomId)
        return res.redirect(`/chat/detail/${chatRoomId}`);

        // 채팅방 목록으로 이동은 nav 영역에서 클릭으로 이동할거라 주석처리
        // 채팅방 목록 페이지로 이동
        // return res.redirect('/chat/list');
        
    } catch (e) {
        Log.Write('chat/request[GET]', e, true);
        return res.send('error: ' + e);
    }
});

// 채팅 리스트 페이지
router.get('/list', async (req, res) => {
    try {
        const user = req.user;
        
        // 1. 내가 포함된 채팅방 리스트 가져오기
        let result = await db.collection('chatRoom').find({ member: user._id }).toArray(); // member는 배열이지만 아래와 같이 쿼리를 짜도 잘 가져옴
        // console.log(result);

        // 2. 상대방 id만 뽑아오기
        let partnerId = result.map((chatRoom)=>{
            return chatRoom.member.find((id)=>{
                return id.toString() !== user._id.toString();
            });
        });

        // 3. DB에서 상대 nickname 가져오기, patrnerId 배열 순서대로 가져와야해서 id도 함께 조회한다
        let partnerNick = await db.collection('user').find({_id : {$in : partnerId}}, {projection : {usernick : 1}}).toArray();

        // 3-1.id와 nickname 순서 맞춰주며 chatList에 상대 nickname 합치기
        partnerId.forEach((x, i)=>{
            partnerNick.forEach((y)=>{
                if(x.toString() === y._id.toString()){
                    result[i].partnerNick = y.usernick;
                }
            });
        });

        res.render('chatList.ejs', { user: user, chatList: result });
    } catch (e) {
        Log.Write('chat/list[GET]', e, true);
        return res.send('error: ' + e);
    }
});

// 채팅 상세 페이지
router.get('/detail/:id', async (req, res) => {
    try {
        const user = req.user;
        const chatId = req.params.id;

        let result = await db.collection('chatRoom').findOne({
            _id: new ObjectId(chatId),
        });

        let isMember = result.member.some(x => x.toString() === user._id.toString());


        if (isMember) {
            res.render('chatDetail.ejs', { user: user, result: result });
        } else {
            res.send('너의 채팅방이 아니란다');
        }
    } catch (e) {
        Log.Write('chat/detail[GET]', e, true);
        return res.send('error: ' + e);
    }
});

module.exports = router;
