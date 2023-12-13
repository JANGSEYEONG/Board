const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { ObjectId } = require('mongodb') 
const {Log} = require('../log.js')

let db;

connectDB.then((client)=>{
  db = client.db('forum')
}).catch((e)=>{
  Log.Write('DB CONNECTION',e,true)
})

// 리스트 조회 미들웨어
router.use('/', (res,req,next)=>{
  console.log(1)
  next()
})

router.use('/', (res,req,next)=>{
  console.log(2)
  next()
})

// 리스트 전체 조회
router.get('/', async (req,res)=>{

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
router.get('/:page', async(req, res)=>{
    
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
router.get('/next/:id', async(req, res)=>{
  try{
      const query = {_id : {$gt : new ObjectId(req.params.id)}};
      const result = await db.collection('post').find(query).limit(5).toArray();

      res.render('list.ejs', {lists : result})
  }catch(e){
      Log.Write('list[GET]',e, true);
      res.send('error: ' + e);
  }
})


module.exports = router;