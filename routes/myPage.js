const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');
const Util = require('../scripts/util.js');
let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// 마이페이지 조회
router.get('/', (req, res) => {
    const User = req.user;
    // res.render('myPage.ejs', {userID : User.username});
    //console.log(User);
    res.render('myPage.ejs', { user: User });
});

// 닉네임 변경하기
router.put('/chgNick/:id', async (req, res) => {
    try {
        const User = req.user;

        console.log(`${User._id}   ${req.params.id}`);
        if (User._id.toString() !== req.params.id.toString()) return res.send('로그인한 데이터와 변경하려는 닉네임 사용자가 다릅니다.');

        // 닉네임 빈값 확인
        const chgNick = req.body.nickname;
        if (Util.IsNullOrWhiteSpace(chgNick)) return res.send('바꾸려는 닉네임이 비어있습니다.');

        // 닉네임 중복 확인
        const isDuplicateNick = await db.collection('user').findOne({ usernick: chgNick });
        if (isDuplicateNick) return res.send('닉네임 중복');

        const data = { usernick: chgNick };
        const result = await db.collection('user').updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
        console.log(result);
        return res.redirect('/myPage');
    } catch (e) {
        Log.Write('chgNick/:id[PUT]', e, true);
        return res.send('error: ' + e);
    }
});

module.exports = router;
