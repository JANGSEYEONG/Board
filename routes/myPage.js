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

// 마이페이지 조회
router.get('/', (req, res)=>{
  const User = req.user;
  if(User === undefined || User === null || User === ''){
      res.redirect('/login');
  }
  //console.log(req.user.username)
  res.render('myPage.ejs', {userID : User.username});
})

module.exports = router;