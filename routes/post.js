const router = require('express').Router();
const connectDB = require('../client/DBClient.js');
const { ObjectId } = require('mongodb');
const { Log } = require('../log.js');
const upload = require('../client/S3Client.js');
const moment = require('moment');

let db;

connectDB
    .then((client) => {
        db = client.db('forum');
    })
    .catch((e) => {
        Log.Write('DB CONNECTION', e, true);
    });

// 글 작성 페이지
router.get('/write', async (req, res) => {
    res.render('write.ejs', {user : req.user});
});

// 글 수정 페이지
router.get('/edit/:id', async (req, res) => {
    try {
        const result = await db.collection('post').findOne({ _id: new ObjectId(req.params.id) });
        console.log(`id : ${req.params.id}, result : ${JSON.stringify(result)}`);
        res.render('edit.ejs', { list: result, user : req.user });
    } catch (e) {
        Log.Write('edit/:id[GET]', e, true);
        res.send('error: ' + e);
    }
});

// 글 등록
// 글 저장 시 이미지 업로드 미들웨어 추가
// upload.single('img') : name이 "img" 인 이미지 데이터가 들어오면 s3에 자동 업로드 해주게 추가
// upload.array('img', 2) : 이미지가 여러개일 경우 사용, 두번쨰 파라미터는 최대 파일 개수
// 근데 에러처리 하고싶으면 미들웨어로 쓰면 안댐.
router.post('/add', async (req, res) => {
    // 파일 업로드 에러처리하려면 이렇게 콜백함수 처리해야함
    upload.single('img')(req, res, async (err) => {
        if (err) {
            Log.Write('add[POST,file]', err, true);
            return res.send('파일 업로드 에러');
        }

        // 업도르 완료 시 업로드된 이미지의 url 생성 "req.file" or "req.files"
        // file 객체 내의 location 항목이 업로드된 이미지의 url
        //console.log(req.file)

        if (req.body.title == '' || req.body.content == '') {
            console.log('비어있습니다~');
            return res.redirect('/post/write');
        }

        try {
            const User = req.user;
            // console.log(User);
            /**
             * 작성자 id, 제목, 내용, attachFile, 작성 시간, 수정 여부
             */
            const insertData = {
                writerId: User._id,
                writerNick: User.usernick, //나중에 닉네임 바꾼건 반영 x, 수정하면 반영됨
                title: req.body.title,
                content: req.body.content,
                img: req?.file?.location, //이미지 여러개면 array 자료형 쓰기
                time : moment().format("YYYY-MM-DD HH:mm:ss"),
                isEdit: false // 수정 여부
            }
            await db.collection('post').insertOne(insertData);
        } catch (e) {
            Log.Write('add[POST]', e, true);
            res.send('error: ' + e);
        }

        return res.redirect('/list');
    });
});

// 글 수정
router.put('/edit/:id', async (req, res) => {
    try {
        const User = req.user;
        if (req.body.title == '' || req.body.content == '') {
            console.log('비어있습니다~');
            return res.redirect('/post/write');
        }
        // 이미지 변경은 s3에서도 지워야하니까 나중에 추가하기
        const editData = { 
            writerNick: User.usernick,
            title: req.body.title,
            content: req.body.content,
            time : moment().format("YYYY-MM-DD HH:mm:ss"),
            isEdit : true };
        //console.log(`edit-put:id : ${JSON.stringify(data)}`)
        await db.collection('post').updateOne({ _id: new ObjectId(req.params.id) }, { $set: editData });

        return res.redirect('/list');
    } catch (e) {
        Log.Write('edit/:id[PUT]', e, true);
        return res.send('error: ' + e);
    }
});

// 글 삭제
router.delete('/delete', async (req, res) => {
    console.log(req.query.id);
    try {

        const postId = req.query.id;
        
        // 로그인한 userId와 작성자 Id가 같은지 서버에서 다시 체크하기
        const query = { _id: new ObjectId(postId), writerId: new ObjectId(req.user._id) };
        const result = await db.collection('post').deleteOne(query);
        console.log(`${result.deletedCount}`);

        // 게시글을 부모로 가진 comment들도 삭제 필요
        const query2 = { parentPostId : new ObjectId(postId) };
        const result2 = await db.collection('comment').deleteMany(query2);
        console.log(`${result2.deletedCount}`);

        // ajax로 요청받은 경우 redirect, render 불가 -> 새로고침이잖슴..
        // 이럴 때는 UI 를 프론트단에서 display:none 해주는 방식으로하거나 리액트같은거 쓰거나.,.
        //return res.redirect('/list')

        return res.send(result.deletedCount.toString());

    } catch (e) {
        Log.Write('delete[DELETE]', e, true);
        return res.send('error: ' + e);
    }
});

// 글 조회
router.get('/detail/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const result = await db.collection('post').findOne({ _id: new ObjectId(postId) });
        // console.log(`id : ${req.params.id}, result : ${JSON.stringify(result)}`)

        const result2 = await db.collection('comment').find({ parentPostId: new ObjectId(postId)}).toArray();
        if (result == null) {
            res.status(400).send('해당 글이 존재하지 않습니다.');
        } else {
            return res.render('detail.ejs', { list: result, user : req.user, comments: result2 });
        }
    } catch (e) {
        Log.Write('detail/:id[GET]', e, true);
        res.send('이상한거 넣지 마세요. error: ' + e);
    }
});

module.exports = router;
