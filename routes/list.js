const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');

let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// 리스트 조회 미들웨어
router.use('/', (req, res, next) => {
    console.log(1);
    next();
});

router.use('/', (req, res, next) => {
    console.log(2);
    next();
});

// 리스트 전체 조회
router.get('/', async (req, res) => {
    try {
        //console.log(`list get 실행..`)
        const result = await db.collection('post').find().toArray();
        res.render('list.ejs', { lists: result });
    } catch (e) {
        Log.Write('list[GET]', e, true);
        res.send('error: ' + e);
    }
});

// 검색
router.get('/search', async (req, res) => {
    try {
        const keyword = req.query.val;
        const query1 = { title: { $regex: keyword } }; // $regex : 특정 문자를 포함하는

        // 숫자를 찾을 땐 $text 없이 위에처럼 써도 된다
        // 문자 인덱스 찾을 땐 $text 연산자 이용
        //const query2 = { $text : {$search: keyword}}; // $regex : 특정 문자를 포함하는, title에 text index 적용
        // 인덱스 단점 : 정확한 것만 찾음.. ~~포함 이런거안댐..보통 숫자 검색시에 유용

        // //성능 비교, statge가 COLLSCAN만 아니면 빠른ㄱㅓ
        // const result1 = await db.collection('post').find(query1).explain('executionStats'); //성능 체크
        // const result2 = await db.collection('post').find(query2).explain('executionStats'); //성능 체크

        // console.log(result1)
        // console.log(result2)
        const result = await db.collection('post').find(query1).toArray();

        res.render('list.ejs', { lists: result });
    } catch (e) {
        Log.Write('search[GET]', e, true);
        res.send('error: ' + e);
    }
});

// 리스트 페이지별 조회
router.get('/:page', async (req, res) => {
    console.log(':page');
    try {
        const limitCount = 5;
        const startOrder = (Number(req.params.page) - 1) * limitCount; // 비어있거나 할 때 예외처리 추가하면 좋을듯

        // skip 안에 100만 정도의 숫자가 들어가면 짱느려지는 단점이 있음
        const result = await db.collection('post').find().skip(startOrder).limit(limitCount).toArray();
        res.render('list.ejs', { lists: result });
    } catch (e) {
        Log.Write('list/:page[GET]', e, true);
        res.send('error: ' + e);
    }
});

// 마지막 글에서 다음 ~개 가져오기
router.get('/next/:id', async (req, res) => {
    console.log('/next/:id');
    try {
        const query = { _id: { $gt: new ObjectId(req.params.id) } };
        const result = await db.collection('post').find(query).limit(5).toArray();

        res.render('list.ejs', { lists: result });
    } catch (e) {
        Log.Write('list[GET]', e, true);
        res.send('error: ' + e);
    }
});

module.exports = router;
