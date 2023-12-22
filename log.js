const path = require('path');
const fs = require('fs');

const LogPath = path.join(__dirname, 'Log');

module.exports.Log = {
    Init: function () {
        // Log 폴더가 없으면 만든다
        if (!fs.existsSync(LogPath)) {
            fs.mkdirSync(LogPath);
        }
    },
    Write: function (method, msg, isErr) {
        // 로그 발생 메소드와 메세지, 실제 에러 여부를 오늘 날짜 파일에 시간을 포함해 적는다.
        let fileName = this.GetFileName();
        let content = `${new Date()}\n {IsError: ${isErr ? true : false}, Method: ${method}, Message: ${msg}} \n\n`;

        fs.appendFileSync(path.join(LogPath, `${fileName}.txt`), content);
    },
    GetFileName: function () {
        // 파일 이름 생성 규칙 : Log20231204.txt

        let today = new Date();

        let month = (today.getMonth() + 1).toString().padStart(2, '0');
        let day = today.getDate().toString().padStart(2, '0');
        let fileName = `Log${today.getFullYear()}${month}${day}`;

        return fileName;
    },
};
