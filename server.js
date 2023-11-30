
const path = require('path')
const {MongoClient} = require('mongodb')

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


app.get('/', (req, res) => {
    // html 같은 파일 보내기
    // __dirname : 현재 server.js 파일의 절대경로
    res.sendFile(__dirname + '/index.html')
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

app.get('/list', async (req,res)=>{
    const result = await db.collection('post').find().toArray();
    // res.send(result[0].title)
    console.log(result[0])
    res.render('list.ejs', {lists : result})
})

app.get('/time', async (req,res)=>{ 
    res.render('time.ejs', {time : new Date()})
})