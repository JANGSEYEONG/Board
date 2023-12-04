
const path = require('path')

const {MongoClient} = require('mongodb')
const { ObjectId } = require('mongodb') 

const express = require('express')
const app = express()

const Keys = require('./keys.js')

const url = Keys.DBURL;

let db;

new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')

    //db 연결 성공해야 서버 띄우기
    app.listen(8080, () => {
        console.log('http://localhost:8080 에서 서버 실행중')
    })

}).catch((err)=>{
    console.log(err)
})

// ejs 템플릿 엔진 세팅
app.set('view engine', 'ejs') 

// public 폴더 등록
// app.use(express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public'))); 

// 유저가 보낸 데이터 쉽게 꺼내쓸 수 있게 use 설정 (req.body)
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.get('/', (req, res) => {
    // html 같은 파일 보내기
    // __dirname : 현재 server.js 파일의 절대경로
    res.sendFile(__dirname + '/index.html')
}) 


// 리스트 조회
app.get('/list', async (req,res)=>{

    try {
        const result = await db.collection('post').find().toArray();
        // res.send(result[0].title)
        //console.log(result[0])
        res.render('list.ejs', {lists : result})
    } catch(e) {
        // 에러 로그파일 만드는거 연습해도 좋을듯
        console.log(e);
        res.send('error: ' + e);
    }
    
})

app.get('/write', async (req,res)=>{

    res.render('write.ejs')
})

// 글 등록
app.post('/add', async (req,res)=>{

    console.log(req.body)
    // db.collection('post').insertOne({title : '게시글3', content: '내용333'})

    // const result = await db.collection('post').find().toArray();
    // res.render('list.ejs', {lists : result})
    if(req.body.title == '' || req.body.content == ''){
        console.log('비어있습니다~');
        return res.redirect('/write')
    }

    try {
        await db.collection('post').insertOne({title : req.body.title, content: req.body.content})
    } catch(e) {
        // 에러 로그파일 만드는거 연습해도 좋을듯
        console.log(e);
        res.send('error: ' + e);
    }

    return res.redirect('/list')
})

// 글 수정
app.post('/edit/:id', async(req, res) => {

    try{
        const data = { title : req.body.title, content : req.body.content}
        console.log(`edit:id : ${JSON.stringify(data)}`)
        await db.collection('post').updateOne({_id : new ObjectId(req.params.id)},{$set : data})
        
        const result = await db.collection('post').find().toArray();
        res.render('list.ejs', {lists : result})
    } catch(e) {
        // 에러 로그파일 만드는거 연습해도 좋을듯
        console.log(e);
        res.send('error: ' + e);
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
        // 에러 로그파일 만드는거 연습해도 좋을듯
        console.log(e);
        res.send('이상한거 넣지 마세요. error: ' + e);
    }
})


app.get('/edit/:id', async(req, res)=>{
    try {
        const result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)})
        console.log(`id : ${req.params.id}, result : ${JSON.stringify(result)}`)
        res.render('edit.ejs', {list : result})
    }catch(e){
        // 에러 로그파일 만드는거 연습해도 좋을듯
        console.log(e);
        res.send('error: ' + e);
    }
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
