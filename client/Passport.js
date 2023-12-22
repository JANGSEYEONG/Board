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
// 세션 만들기 함수
passport.serializeUser((user, done) => {
    // 여기서 user는 db에서 뽑아온 user 정보 다 들어있음
    // req.logIn 함수의 첫번째 파라미터로 내가 user의 모든 정보를 그대로 보내줘서.
    process.nextTick(() => {
        // 두번째 내용이 기록된 session document를 db에 발행해준다.
        // 즉, 두번째 파라미터는 db의 session document에 추가될 내용!!
        // 그리고 생성한 session document의 _id를 자동으로 쿠키에 적어서 클라이언트에 보내준다

        // 보통 세션에는 유효기간같은걸 작성하는데, 이 라이브러리는 알아서 해줌
        done(null, { id: user._id, username: user.username });
    });

    /** process.nextTick
     * nodeJS 환경에서 특정 내부 코드를 비동기적으로 처리하고 싶을 때 사용하는 코드 *비슷한 기능: queueMicrotask()
     * 일반적으로 js는 동기적으로 동작하나, 가끔 시간이 오래걸리는 코드들은 다음 코드 실행을 지연시키기에
     * 오래걸리나 순서가 중요하지 않은 코드들은 비동기 처리를 해줘야한다.
     * 이 안에 쓰는 코드는 잠깐 보류하고 다른 작업이 끝나면 실행!
    */
});



// 쿠키 까서 확인하는 함수!!
// 유저가 session Id가 담긴 쿠키를 서버에 보내면 deserializeUser 함수에서
// 쿠키를 까보고 세션 데이터랑 비교하는 역할
// 세션 데이터 있는지 조회!, 유저가 로그인 잘되어있는지 여부 판단
// 유저가 보낸 쿠키를 분석하는 함수
passport.deserializeUser(async (user, done) => {
    // 이 함수의 첫번째 파라미터는 세션 document에 적힌 유저 정보가 들어있다
    // 즉, serializeUser의 done에서 두번째 파라미터로 적은 정보가 들어온다.
    // console.log(`deserializeUser ${JSON.stringify(user)}`)

    // 쿠키와 세션 데이터를 비교해보고 별 이상이 없으면 현재 로그인된 유저 정보를 알려준다
    // user를 그대로 보내기에는 세션 데이터가 오래되었을 수 있으니, db에서 조회해서 보낸다
    let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) });
    delete result.password;
    process.nextTick(() => {
        // 여기서 두번째 파라미터에 넣은 것이 자동으로 req.user 안에 들어감
        return done(null, result);
    });
});

module.exports.passport = passport;
module.exports.LocalStrategy = LocalStrategy;
