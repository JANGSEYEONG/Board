require('dotenv').config();

const path = require('path');

// const {MongoClient} = require('mongodb')
const { ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');

const methodOverride = require('method-override');

const express = require('express');
const app = express();

const DBURL = process.env.DB_URL;
const PORT = process.env.PORT;

const { Log } = require('./log.js');
const middle = require('./middle.js');
const session = require('express-session');

const { passport } = require('./client/Passport.js');

// 로그 작성 관련 초기화
Log.Init();

// mongoDB auto increment 기능 추가해보기, 페이지들 한번 싹 정리하기
const connectDB = require('./client/DBClient.js');
let db;
connectDB
    .then((client) => {
        console.log('DB연결성공');
        db = client.db('forum');

        //db 연결 성공해야 서버 띄우기
        app.listen(PORT, () => {
            console.log('http://localhost:8080 에서 서버 실행중');
        });
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// ejs 템플릿 엔진 세팅
app.set('view engine', 'ejs');

// public 폴더 등록
// app.use(express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// 유저가 보낸 데이터 쉽게 꺼내쓸 수 있게 use 설정 (req.body)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 메소드 강제 변경 라이브러리 추가
app.use(methodOverride('_method'));

// passport 라이브러리 세팅
app.use(passport.initialize());
app.use(
    session({
        secret: '암호화에 쓸 비번',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60 * 60 * 1000 }, //session document 유효기간 설정 (1시간)
        store: MongoStore.create({ //DB 연결
            mongoUrl: DBURL,
            dbName: 'forum',
        }),
    })
);

app.use(passport.session());

// 시작화면 설정
app.get('/', middle.checkLogin, (req, res) => {
    res.redirect('/list');
});

// 인증 관련 router (로그인, 회원가입)
app.use('/auth', require('./routes/auth.js'));

// 리스트 관련 router
app.use('/list', require('./routes/list.js'));

// 에러페이지
app.get('/error', (req, res) => {
    res.render('error.ejs');
});

app.get('/search', async (req, res) => {
    console.log(req.query.val);
    let result = await db.collection('post').find({ title: req.query.val }).toArray();
    응답.render('search.ejs', { 글목록: result });
});

// 이 아래 api부터는 로그인 체크 미들웨어 사용
app.use(middle.checkLogin);

// 게시물 관련 router
app.use('/post', require('./routes/post.js'));

// 댓글 관련 router
app.use('/comment', require('./routes/comment.js'));

// 마이페이지 관련 router
app.use('/myPage', require('./routes/myPage.js'));

// 연습용 API 들
// app.get('/time', async (req,res)=>{
//     res.render('time.ejs', {time : new Date()})
// })

// app.get('/news', (req, res) => {
//     res.send('뉴스입니다')
//     //db.collection('post').insertOne({title : '게시글3', content: '내용333'})
// })

// app.get('/shop', (req, res) => {
//     res.send('쇼핑페이지입니다~')
// })

// app.get('/about', (req, res) => {
//     //html 같은 파일 보내기
//     //__dirname : 현재 server.js 파일의 절대경로
//     //res.sendFile(__dirname + '/index.html')
//     res.sendFile(__dirname + '/introduce.html')
// })
