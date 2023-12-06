
const path = require('path')

const {MongoClient} = require('mongodb')
const { ObjectId } = require('mongodb') 
const methodOverride = require('method-override')

const express = require('express')
const app = express()

const {DBURL} = require('./keys.js')
const {Log} = require('./log.js')

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

let db;

// 로그 작성 관련 초기화
Log.Init();

// mongoDB auto increment 기능 추가해보기, 페이지들 한번 싹 정리하기
new MongoClient(DBURL).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')

    //db 연결 성공해야 서버 띄우기
    app.listen(8080, () => {
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
    cookie : { maxAge : 60 * 60 * 1000 }
}))

app.use(passport.session()) 

// passport 로그인 검증 로직
// 이 코드 하단에 API들을 만들어야 그 API들은 로그인관련 기능들이 잘 작동
//API 안에서 passport.authenticate('local') 이런 코드 작성하면 요 코드가 자동으로 실행
passport.use(new LocalStrategy(async (userId, userPwd, cb) => {
    // 검증 로직 짜면 된다
    let result = await db.collection('user').findOne({ username : userId})
    if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
    }
    if (result.password == userPwd) {
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

app.get('/', (req, res) => {
    // html 같은 파일 보내기
    // __dirname : 현재 server.js 파일의 절대경로
    //res.sendFile(__dirname + '/index.html')
    console.log(req.user)
    res.redirect('/list')
}) 


// 리스트 조회
app.get('/list', async (req,res)=>{

    try {
        //console.log(`list get 실행..`)
        const result = await db.collection('post').find().toArray();
        res.render('list.ejs', {lists : result})
    } catch(e) {
        Log.Write('list[GET]',e, true);
        res.send('error: ' + e);
    }
    
})

// 리스트 페이지별 조회
app.get('/list/:page', async(req, res)=>{
    
    try{
        const limitCount = 5;
        const startOrder = (Number(req.params.page) - 1) * limitCount; // 비어있거나 할 때 예외처리 추가하면 좋을듯
        
        // skip 안에 100만 정도의 숫자가 들어가면 짱느려지는 단점이 있음
        const result = await db.collection('post').find().skip(startOrder).limit(limitCount).toArray();
        res.render('list.ejs', {lists : result})
    }catch(e){
        Log.Write('list/:page[GET]',e, true);
        res.send('error: ' + e);
    }
})

// 마지막 글에서 다음 ~개 가져오기
app.get('/list/next/:id', async(req, res)=>{
    try{
        //console.log(req.params.id)
        const query = {_id : {$gt : new ObjectId(req.params.id)}};
        const result = await db.collection('post').find(query).limit(5).toArray();
        //res.send(req.params.id);
        
        res.render('list.ejs', {lists : result})
    }catch(e){
        Log.Write('list[GET]',e, true);
        res.send('error: ' + e);
    }
})

app.get('/write', async (req,res)=>{

    res.render('write.ejs')
})

// 글 등록
app.post('/add', async (req,res)=>{

    console.log(req.body)

    if(req.body.title == '' || req.body.content == ''){
        console.log('비어있습니다~');
        return res.redirect('/write')
    }

    try {
        await db.collection('post').insertOne({title : req.body.title, content: req.body.content})
    } catch(e) {
        Log.Write('add[POST]',e, true);
        res.send('error: ' + e);
    }

    return res.redirect('/list')
})

// 글 수정
app.put('/edit/:id', async(req, res) => {

    try{
        const data = { title : req.body.title, content : req.body.content}
        //console.log(`edit-put:id : ${JSON.stringify(data)}`)
        await db.collection('post').updateOne({_id : new ObjectId(req.params.id)},{$set : data})
        
        return res.redirect('/list')
    } catch(e) {
        Log.Write('edit/:id[PUT]',e, true);

        return res.send('error: ' + e);
    }
})

// 글 삭제
app.delete('/delete', async(req, res)=>{
    console.log(req.query.id)
    try{
        const query = {_id : new ObjectId(req.query.id)};
        const result = await db.collection('post').deleteOne(query);
        console.log(`${result.deletedCount }`)

        // ajax로 요청받은 경우 redirect, render 불가 -> 새로고침이잖슴..
        //return res.redirect('/list')
        res.send('삭제완료')
    }catch(e){
        Log.Write('delete[DELETE]',e, true);
        return res.send('error: ' + e);
    }
})

app.get('/detail/:id', async (req, res)=>{

    try{

        const result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)})
        console.log(`id : ${req.params.id}, result : ${JSON.stringify(result)}`)
        
        if(result == null){
            res.status(400).send('해당 글이 존재하지 않습니다.')
        }else{
            return res.render('detail.ejs', {list : result});
        }
        
    }catch(e){
        Log.Write('detail/:id[GET]',e, true);
        res.send('이상한거 넣지 마세요. error: ' + e);
    }
})


app.get('/edit/:id', async(req, res)=>{
    try {
        const result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)})
        console.log(`id : ${req.params.id}, result : ${JSON.stringify(result)}`)
        res.render('edit.ejs', {list : result})
    }catch(e){
        Log.Write('edit/:id[GET]',e, true);
        res.send('error: ' + e);
    }
})

// 로그인 페이지
app.get('/login', (req, res)=>{
    res.render('login.ejs')
})

app.post('/login', (req, res, next)=>{
    //제출한아이디/비번이 DB에 있는거랑 일치하는지 확인하고 세션생성
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)
        
        // 검증 성공 시 세션 생성
        req.logIn(user, (err) => {
            if (err) return next(err)
            res.redirect('/')
        })
    })(req, res, next)
})
// 연습용 API

app.get('/time', async (req,res)=>{ 
    res.render('time.ejs', {time : new Date()})
})


app.get('/news', (req, res) => {
    res.send('뉴스입니다')
    //db.collection('post').insertOne({title : '게시글3', content: '내용333'})
}) 

app.get('/shop', (req, res) => {
    res.send('쇼핑페이지입니다~')
}) 

app.get('/about', (req, res) => {
    res.sendFile(__dirname + '/introduce.html')
}) 
