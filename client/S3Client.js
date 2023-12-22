// multer 라이브러리 사용
const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.S3_KEY,
        secretAccessKey: process.env.S3_SECRET,
    },
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'seyeong-test',
        key: function (req, file, cb) {
            //req안에는 사용자가 업로드할 때의 파일 명이 들어있음
            cb(null, Date.now().toString()); //업로드시 파일명 변경가능
        },
    }),
});

module.exports = upload;
