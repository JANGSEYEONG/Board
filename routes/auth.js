const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const {passport} = require('../client/Passport.js');
const { ObjectId } = require('mongodb');
const {Log} = require('../log.js');
const middle = require('../middle.js');
const bcrypt = require('bcrypt') 

let db;

connectDB.then((client)=>{
  db = client.db('forum')
}).catch((e)=>{
  Log.Write('DB CONNECTION',e,true)
})

// 로그인 페이지
router.get('/login', (req, res)=>{
  res.render('login.ejs')
})

// 로그인 요청
router.post('/login', middle.checkIdPwEmpty, (req, res, next)=>{
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

// 회원가입 요청
router.post('/register', middle.checkIdPwEmpty, async (req, res)=>{
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

// 로그아웃
router.get('/logout', (req,res)=>{
  // 쿠키 삭제
  res.cookie('connect.sid','',{maxAge:0});
  res.redirect('/');
})

module.exports = router;