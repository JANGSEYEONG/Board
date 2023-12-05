
const path = require('path')

const {MongoClient} = require('mongodb')
const { ObjectId } = require('mongodb') 
const methodOverride = require('method-override')

const express = require('express')
const app = express()

const {DBURL} = require('./keys.js')
const {Log} = require('./log.js')

let db;

// 로그 작성 관련 초기화
Log.Init();

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

app.get('/', (req, res) => {
    // html 같은 파일 보내기
    // __dirname : 현재 server.js 파일의 절대경로
    res.sendFile(__dirname + '/index.html')
}) 


// 리스트 조회
app.get('/list', async (req,res)=>{

    try {
        console.log(`list get 실행..`)
        const result = await db.collection('post').find().toArray();
        res.render('list.ejs', {lists : result})
    } catch(e) {
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
        console.log(`edit-put:id : ${JSON.stringify(data)}`)
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
