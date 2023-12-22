const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');

const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');

const connectDB = require('../client/DBClient.js');
let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// passport 로그인 검증 로직
// 이 코드 하단에 API들을 만들어야 그 API들은 로그인관련 기능들이 잘 작동
// API 안에서 passport.authenticate('local') 이런 코드 작성하면 요 코드가 자동으로 실행
passport.use(
    new LocalStrategy(async (userId, userPwd, cb) => {
        // input태그의 value가 마법처럼 userId, userPwd로 들어온다.
        // 단, input 태그의 name 속성은  "username", "password" 이여야함
        // 검증 로직 작성하면 된다. db에서 비교
        let result = await db.collection('user').findOne({ username: userId });
        if (!result) {
            // 결과에 이상이 있는 경우, 두번째 파라미터로 false를 보낸다.
            return cb(null, false, { message: '아이디 DB에 없음' });
        }
        if (await bcrypt.compare(userPwd, result.password)) {
            // 로그인 성공 시, 두번째 파라미터로 디비에서 받아온 유저 정보를 보낸다.
            return cb(null, result);
        } else {
            // 결과에 이상이 있는 경우, 두번째 파라미터로 false를 보낸다.
            return cb(null, false, { message: '비번불일치' });
        }
    })
);

// req.login() 함수 실행 시 자동으로 동작
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username, usernick: user.usernick });
    });
});

// 쿠키 까서 확인, 세션 데이터 있는지 조회, 유저가 로그인 잘되어있는지 여부 판단
passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) });
    delete result.password;
    process.nextTick(() => {
        // 여기서 두번째 파라미터에 넣은 것이 자동으로 req.user 안에 들어감
        return done(null, result);
    });
});

module.exports.passport = passport;
module.exports.LocalStrategy = LocalStrategy;
