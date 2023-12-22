const middle = {};

// 아이디, 비밀번호가 비어있는지 체크
middle.checkIdPwEmpty = (req, res, next) => {
    if (req.body.username == '' || req.body.password == '') {
        res.send('그러지마세요');
    } else {
        next();
    }
};

middle.checkLogin = (req, res, next) => {
    const User = req.user;
    if (User) {
        console.log(`name : ${User.username} 로그인함`);
        next();
    } else {
        console.log('로그인 안함');
        res.redirect('/auth/login');
    }
};

module.exports = middle;
