const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { passport } = require('../client/Passport.js');
const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');
const middle = require('../middle.js');
const bcrypt = require('bcrypt');
const Util = require('../scripts/util.js');

let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// 로그인 페이지
router.get('/login', (req, res) => {
    res.render('login.ejs');
});

// 로그인 요청
// 1. 미들웨어로 로그인하는 id,pw가 비어있는지 확인
// 2. passport 라이브러리로 현재 id/pw가 올바른지 확인
router.post('/login', middle.checkIdPwEmpty, (req, res, next) => {
    //제출한아이디/비번이 DB에 있는거랑 일치하는지 확인하고 세션생성

    // passport.authenticate('local') 을 실행하면 LocalStrategy 가 실행된다.

    passport.authenticate('local', (error, user, info) => {
        // LocalStrategy의 실행 결과로..
        // 1번째 파라미터) 에러가 나면 error에 파라미터가 들어옴
        // 2번째 파라미터) db 확인으로 로그인이 성공하면 user에 db에서 찾은 유저 정보가 들어옴
        // 3번째 파라미터) 로그인 실패이면 실패 메세지가 info로 정보가 들어옴

        // LocalStrategy 의 실행 결과를 가지고 에러 및 성공처리를 한다
        if (error) return res.status(500).json(error); // .json을 쓰면 client에 array/object 자료형을 보낼 수 있음
        // LocalStrategy에서 cb(null,false,{message : '비번불일치'}) 처럼 두번째 파라미터에 false를 적은 경우 info에 세번째 파라미터가 담긴다
        if (!user) return res.status(401).json(info.message); // id/pw가 db와 맞지 않는 경우다. 에러 처리

        // 로그인 성공
        // 검증 성공 시 세션 생성!! req.logIn() 함수. LogIn 함수 실행 시 serializeUser가 자동으로 동작한다
        // 1번째 파라미터) db에서 받아온 user 정보
        // 2번째 파라미터) 로그인 완료 시 콜백함수
        req.logIn(user, (err) => {
            //에러처리
            if (err) return next(err);

            // 로그인 완료 시 실행할 코드 작성
            res.redirect('/list');
        });
    })(req, res, next);
});

// 회원가입 요청
router.post('/register', middle.checkIdPwEmpty, async (req, res) => {
    try {
        const userId = req.body.username;
        const userPassword = req.body.password;
        const userNick = req.body.userNick;

        // 빈 값 체크
        if (Util.IsNullOrWhiteSpace(userId)) return res.send('아이디 비어있음');
        if (Util.IsNullOrWhiteSpace(userPassword)) return res.send('비번 비어있음');
        if (Util.IsNullOrWhiteSpace(userNick)) return res.send('닉네임 비어있음');

        // id 중복 체크
        const isDuplicateId = await db.collection('user').findOne({ username: userId });
        const isDuplicateNick = await db.collection('user').findOne({ usernick: userNick });

        if (isDuplicateId) return res.send('아이디 중복');
        if (isDuplicateNick) return res.send('닉네임 중복');

        const result = await db.collection('user').insertOne({
            username: userId,
            password: await bcrypt.hash(userPassword, 10), // 암호화
            usernick: userNick,
        });
        return res.redirect('/');
    } catch (e) {
        Log.Write('register[post]', e, true);
        res.send('error: ' + e);
    }
});

// 로그아웃
router.get('/logout', (req, res) => {
    // 쿠키 삭제
    res.cookie('connect.sid', '', { maxAge: 0 });
    res.redirect('/');
});

module.exports = router;
