
require('dotenv').config() 

const path = require('path')

// const {MongoClient} = require('mongodb')
const { ObjectId } = require('mongodb') 
const MongoStore = require('connect-mongo')

const methodOverride = require('method-override')

const express = require('express')
const app = express()

const DBURL = process.env.DB_URL;
const PORT = process.env.PORT;

const {Log} = require('./log.js')

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

const bcrypt = require('bcrypt') 

// 로그 작성 관련 초기화
Log.Init();

// mongoDB auto increment 기능 추가해보기, 페이지들 한번 싹 정리하기
const connectDB = require('./client/DBClient.js');
let db;
connectDB.then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')

    //db 연결 성공해야 서버 띄우기
    app.listen(PORT, () => {
        console.log('http://localhost:8080 에서 서버 실행중')
    })

}).catch((e)=>{
    Log.Write('DB CONNECTION',e,true)
})

// ejs 템플릿 엔진 세팅
app.set('view engine', 'ejs') 

// public 폴더 등록
// app.use(express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public'))); 

// 유저가 보낸 데이터 쉽게 꺼내쓸 수 있게 use 설정 (req.body)
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// 메소드 강제 변경 라이브러리 추가
app.use(methodOverride('_method')) 

// passport 라이브러리 세팅
app.use(passport.initialize())
app.use(session({
    secret: '암호화에 쓸 비번',
    resave : false,
    saveUninitialized : false,
    cookie : { maxAge : 60 * 60 * 1000 },
    store: MongoStore.create({
        mongoUrl : DBURL,
        dbName: 'forum',
    })
}))

app.use(passport.session()) 

// multer 라이브러리 사용
// const { S3Client } = require('@aws-sdk/client-s3')
// const multer = require('multer')
// const multerS3 = require('multer-s3')
// const s3 = new S3Client({
//     region : 'ap-northeast-2',
//     credentials : {
//         accessKeyId : process.env.S3_KEY,
//         secretAccessKey : process.env.S3_SECRET,
//     }
// })

// const upload = multer({
//     storage: multerS3({
//         s3: s3,
//         bucket: 'seyeong-test',
//         key: function (req, file, cb) {
//             //req안에는 사용자가 업로드할 때의 파일 명이 들어있음
//             cb(null, Date.now().toString()) //업로드시 파일명 변경가능
//         }
//     })
// })

// passport 로그인 검증 로직
// 이 코드 하단에 API들을 만들어야 그 API들은 로그인관련 기능들이 잘 작동
//API 안에서 passport.authenticate('local') 이런 코드 작성하면 요 코드가 자동으로 실행
passport.use(new LocalStrategy(async (userId, userPwd, cb) => {
    // 검증 로직 작성
    let result = await db.collection('user').findOne({ username : userId})
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
    }
    if (await bcrypt.compare(userPwd, result.password)) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비번불일치' });
    }
}))

// req.login() 함수 실행 시 자동으로 동작
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user._id, username: user.username })
    })
})

// 쿠키 까서 확인, 세션 데이터 있는지 조회, 유저가 로그인 잘되어있는지 여부 판단
passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({_id : new ObjectId(user.id) })
    delete result.password
    process.nextTick(() => {
        // 여기서 두번째 파라미터에 넣은 것이 자동으로 req.user 안에 들어감
        return done(null, result)
    })
})


// 로그인 페이지
app.get('/login', (req, res)=>{
    res.render('login.ejs')
})
const checkIdPw = (req, res, next)=>{
    if (req.body.username == '' || req.body.password == '') {
        res.send('그러지마세요')
    } else {
        next()
    }
}
app.post('/login', checkIdPw, (req, res, next)=>{
    //제출한아이디/비번이 DB에 있는거랑 일치하는지 확인하고 세션생성
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)
        
        // 검증 성공 시 세션 생성
        req.logIn(user, (err) => {
            if (err) return next(err)
            res.redirect('/list')
        })
    })(req, res, next)
})

// 회원가입
app.post('/register', checkIdPw, async (req, res)=>{
    console.log(req.body);
    try{
        const userId = req.body.username;
        const pwd = req.body.password;
    
        // id 중복 체크
        const isDuplicate = await db.collection('user').findOne({username : userId})

        if(isDuplicate === undefined || isDuplicate === null){
            const result = await db.collection('user').insertOne({
                username : userId,
                password : await bcrypt.hash(pwd, 10) // 암호화
            });
            res.redirect('/');
        }else{
            res.send('아이디중복');
        }
        
    }catch(e){
        Log.Write('register[post]',e, true);
        res.send('error: ' + e);
    }
})

const checkLogin = (req, res, next)=>{
    const User = req.user;
    if(User){
        console.log(`name : ${User.username} 로그인함`)
        next();
    }else{
        console.log('로그인 안함')
        res.redirect('/login');
    }
}

// 리스트 관련 router
app.use('/list', require('./routes/list.js'));

// 에러페이지
app.get('/error', (req, res)=>{
    res.render('error.ejs');
});

app.get('/logout', (req,res)=>{
    // 쿠키 삭제
    res.cookie('connect.sid','',{maxAge:0});
    res.redirect('/');
})

// 이 아래 api부터는 로그인 체크 미들웨어 사용
app.use(checkLogin)


app.get('/', (req, res) => {
    // html 같은 파일 보내기
    // __dirname : 현재 server.js 파일의 절대경로
    //res.sendFile(__dirname + '/index.html')
    //console.log(req.user)
    res.redirect('/list')
})

// 게시물 관련 router
app.use('/post', require('./routes/post.js') )

// 마이페이지 관련 router
app.use('/myPage', require('./routes/myPage.js') )


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
//     res.sendFile(__dirname + '/introduce.html')
// }) 
