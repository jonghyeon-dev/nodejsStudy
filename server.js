/**
 * npm install express          // express 서버 가동용
 * npm install nodemon -g	    // 내용 수정시 자동재실행(노드몬은 글로벌 npm 으로 설치해야 하므로 -g를 꼭 붙여야함.)
 * npm install ejs              // ejs 문법 및 파일 사용을 위해 
 * npm install method-override  // form tag 에서 put delete 를 사용하기 위해 설치
 * npm install express-session  // express 서버의 session생성을 도와주는 라이브러리
 * npm install passport         // 회원 인증을 도와주는 메인 라이브러리
 * npm install passport-local   // ID 비번 방식으로 회원인증을 도와주는 라이브러리
 * npm install dotenv           // 환경변수 관리 라이브러리
 */

//서버 선언부
const express = require('express') // express 라이브러리 사용하겠다는 뜻
const app = express()
app.use(express.static(__dirname + '/static')) // 폴더를 서버 파일에 등록
//response(요청).body 사용을 위한 세팅
app.use(express.json())//json 형식을 사용하기 위한 선언
app.use(express.urlencoded({extended:true})) // url 파라미터 사용 시 필수
require('dotenv').config() // 환경변수 세팅을 위한 dotenv 사용 설정
// ejs 선언부
app.set('view engine', 'ejs') // ejs 세팅 (ejs는 views 폴더를 만들고 .ejs 파일로 만들어서 사용)
// DB 데이터
const { MongoClient } = require('mongodb') //MongoDb 사용
const ObjectId = require('mongodb').ObjectId; //Id 값을 오브젝트 형식으로 변환하여 사용하기 위해 선언

// 회원 로그인 관련 passport 라이브러리 세팅
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
// bcrypt 암호화 세팅
const bcrypt = require('bcrypt');
//세션 db 저장 라이브러리
const MongoStore = require('connect-mongo');

// MethodOverride 사용을 위한 선언부
const methodOverride = require('method-override') 
app.use(methodOverride('_method')) 

//session 세팅부
app.use(passport.initialize())
app.use(session({
    secret: process.env.SESSION_SECRET, // 암호화에 쓸 비밀번호
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge : process.env.COOKIE_TIME}, // 쿠키 유효 시간
    store: MongoStore.create({
        mongoUrl:process.env.DB_URL,
        dbName:process.env.DB_NAME
    })
}))
app.use(passport.session())

// DB 세팅부
const url = process.env.DB_URL //mongodb사이트에 있는 DataBase Connect에 있는 DB 접속 URL (password 부분 입력 확인)
let db // 다른 요청에서 connection을 사용하기 위해 db listen 바깥에 선언
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db(process.env.DB_NAME) // 연결 데이터베이스 이름
  app.listen(process.env.PORT,()=>{
    console.log('http://localhost:'+process.env.PORT+' 에서 서버 실행 중') 
    })
}).catch((err)=>{
  console.log(err)
})

// 페이징 기초 데이터 세팅
const listSize = 5; // 화면에 표시할 데이터 개수
const pageSize = 5; // 화면에 표시할 페이지 개수
// 페이징 처리 함수
function setPageInfo(totalCount,currentPage){
    // 총 페이지 = 반올림(총 데이터 개수 / 화면에 표시항 데이터 개수)
    let totalPage = Math.ceil(totalCount/listSize);
    // 화면에 표시할 페이지 그룹 = 반올림(현재 페이지 / 화면에 표시할 페이지 개수)
    let pageGroup = Math.ceil(currentPage/pageSize);
    // 화면에 표시할 마지막 페이지 = 화면에 표시할 페이지 그룹 * 화면에 표시할 페이지 개수
    // endPage데이터가 총 페이지 보다 크다면 endPage = totalPage
    let endPage = (pageGroup * pageSize) > totalPage ? totalPage : (pageGroup*pageSize); 
    // 화면에 표시할 시작 페이지 = (화면에 표시할 페이지 그룹 * 화면에 표시할 페이지 개수) - (화면에 표시할 페이지 개수 -1)
    // startPage데이터가 0과 같거나 작다면 startPage = 1
    let startPage =  ((pageGroup * pageSize) - (pageSize -1)) > 0 ? ((pageGroup * pageSize) - (pageSize -1)) : 1; //
    // 화면에 표시할 마지막 페이지가 총 페이지 보다 작다면 '다음' 생성
    let next = endPage < totalPage ? (endPage + 1) : 0;
    // 화면에 표시할 첫번쨰 페이지가 화면에 페이지 개수 보다 크다면 '이전' 생성
    let prev = startPage > pageSize ? (startPage - 1) : 0;
    // 화면에 표시할 페이지 그룹이 반올림(총 페이지/ 화면에 표시할 페이지 개수) 보다 작다면 '처음' 생성
    let last = pageGroup < Math.ceil(totalPage/pageSize)? totalPage : 0;
    // 화면에 표시할 페이지 그룹이 1보다 크다면 처음 생성
    let first = pageGroup > 1 ? 1 : 0;

    let pageInfo = {
        currentPage : currentPage,  // int  현재 페이지
        startPage : startPage,      // int  시작 페이지
        endPage : endPage,          // int  마지막 페이지
        first: first,               // int  처음
        prev : prev,                // int  이전
        next : next,                // int  다음
        last : last                 // int  마지막
    };
    return pageInfo
}


// 미들웨어 사용하기 위해 아래 변수 request,response,next 써야지만 제대로 작동

function middleWare(request,response,next){
    //request.body response.redirect 등 사용 가능
    if(!request.user){
        // response가 실행되면 아래 다른 코드가 실행 안됨
        response.send('로그인을 하세요.')
    }
    next() // 마지막에 없으면 무한 대기 상태에 들어감
}

// '/'로 요청 후 middleWare 실행 이 후 마지막 request,response 함수 실행
app.get('/', middleWare,(request, response) =>{
    response.render('index.ejs') // html화면 전송 시 sendFile 사용, __dirname: 현재 프로잭트 절대경로
})
/**
 * 미들웨어 함수 사용 참고 
 *  참고1.미들웨어 함수를 미들웨어 위치에 즉흥적으로 (요청,응답,next)=>{???} 형식으로 만들어도 됨
 *  참고2.미들웨어 함수 여러개 사용 가능 미들웨어 위치에 [함수1,함수2,함수3] 형식으로 작성하여 1,2,3 순으로 작동
 *  참고3. 'app.use(미들웨어함수)' 작성하면 해당 라인 밑의 전체 api에 해당 미들웨어 함수 적용
 *  참고4. 'app.use(/'url',함수)' 로 적으면 /url 이 포함된 전체 api에 적용 (주의! 해당 라인 밑의 api만 적용)
 * 
 */ 
function nowTime2Turminal(request,response,next){
    console.log(new Date);
    next();
}
function userValidCheck(request,response,next){
    let username = request.body.username;
    let password = request.body.password;
    if(username == '' || password == ''){
        response.send('그러지 마세요.');
    }
    next();
}

app.use('/list',nowTime2Turminal);

app.get('/about',(request, response) =>{
    response.sendFile(__dirname + '/about.html')
})

app.get('/getInst',(request, response) =>{
    db.collection('post').insertOne({title : '제목입니다.',content : '내용입니다.'})
    response.send('데이터가 등록되었습니다.')
})

app.get('/list', async (request,response) =>{ // async 함수
    
    let result = await db.collection('post').find().limit(listSize).toArray() // await은 정해진 곳에서만 쓸 수 있음
    //response.send(result[0].title) // 참고 응답을 한번만 사용가능(send,sendFile,render,redirect)
    let currentPage = 1;
    let totalCount = await db.collection('post').countDocuments();
    let pageInfo = setPageInfo(totalCount, currentPage);
    
    response.render('list.ejs', {글목록 : result, pageInfo : pageInfo})
})

app.get('/time', (request,response) =>{
    const date = new Date()
    response.render('time.ejs',{현재시간 : date.toLocaleString()})
})
/* 
 *  1. Uniform Interface 
 *  - 여러 URL과 method는 일관성이 있어야합니다.
 *  - 하나의 URL로는 하나의 데이터를 가져오게 디자인하는게 좋고 
 *  - 간결하고 예측가능하게 URL과 method를 만드는게 좋습니다. 
 *
 *  2. Client-server 역할 구분 
 *  유저에게 서버역할을 맡기거나 DB를 직접 입출력하게 시키면 안좋습니다. 
 *
 *  3. Stateless
 *  셋째로 요청들은 서로 의존성이 있으면 안되고 각각 독립적으로 처리되어야합니다.
 *
 *  4. Cacheable
 *  서버가 보내는 자료들은 캐싱이 가능해야합니다.
 *  그러니까 자주 받는 자료들은 브라우저에서 하드에 저장해놓고 
 *  서버에 요청을 날리는게 아니라 하드에서 뽑아쓰는걸 캐싱이라고 합니다. 
 *
 *  5. Layered System 
 *  서버기능을 만들 때 레이어를 걸쳐서 코드가 실행되도록 만들어도 된다고 합니다. 
 *
 *  6. Code on demand
 *  서버는 실행가능한 코드를 보낼 수 있습니다.
 */ 
app.get('/write',(request,response)=>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
    response.render('write.ejs')
})

app.post('/insert', async (request,response) =>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
    var add = request.body // 클라이언트가 전송한 데이터를 .body를 통해 가져옴 (윗부분 사전 세팅 선언 코드 있음 L7~8)
    if(add.title === null || add.title.trim() === ''){
        response.send("제목이 없습니다.")
    }else if(add.content === null || add.content.trim() === ''){
        response.send("내용이 없습니다.")
    }else if(add.title.length > 20){
        response.send("제목은 20자리를 넘을 수 없습니다.")
    }else{
        try{
            //어떤 데이터가 어떤 형식으로 올 지 모르므로 등록 할 각각의 데이터를 확실하게 표시하여 등록
            await db.collection('post').insertOne({title : add.title, content : add.content}) 
            response.redirect('/list')
        }catch(e){
            console.log(e) //에러 메시지 출력
            response.status(500).send('서버 에러') //서버 에러시 에러코드도 같이 전송해 주는게 좋음
        }   
    }
})

app.get('/detail/:id', async (request,response) =>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
    let id = request.params.id // url param 가져오는 명령어
    try{
        let result = await db.collection('post').findOne({ _id : new ObjectId(id)}) //상단에 ObjectId 함수 선언 필수 (L15)
        if(result == null || result == ''){
            response.status(404).send("잘못된 URL 입니다.")
        }
        response.render('detail.ejs',{result : result})
    }catch(e){
        console.log(e)
        response.status(404).send("잘못된 URL 입니다.")
    }
    
})

app.get('/modify/:id', async(request,response)=>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
    let id = request.params.id // url param 가져오는 명령어
    try{
        let result = await db.collection('post').findOne({ _id : new ObjectId(id)}) //상단에 ObjectId 함수 선언 필수 (L15)
        if(result == null || result == ''){
            response.status(404).send("잘못된 URL 입니다.")
        }
        response.render('modify.ejs',{result : result})
    }catch(e){
        console.log(e)
        response.status(404).send("잘못된 URL 입니다.")
    }
})

/**
 * db 명령어 정보
 * where 조건
 * updateOne({dataColName : data},set형식) //일치하는 하나의 데이터만
 * update({dataColName : data},set형식) //일치하는 전체의 데이터
 * updateMany(({dataColName : data} {dataColName : data 혹은 {조건식 : data}},set형식)) // 조건식사용가능
 * findOne (selectOne)
 * find (select)
 * findMany (selectMany)
 * deleteOne
 * delete
 * deleteMany
 *  - 조건식 (상세한 내용은 검색으로 찾아볼수 있음)
 *   - /data/ : like (
 *      - {name:/abc/} : name 컬럼에 abc가 포함된 모든 데이터
 *      - {name:/^abc/} : name 컬럼에 문자열이 abc로 시작하는 모든 데이터
 *      - {name:/abc$/} : name 컬럼에 문자열이 abc로 끝나는 모든 데이터
 *   - $gt  : >
 *   - $gte : >=
 *   - &lt  : <
 *   - $lte : <=
 *   - $ne  : !=
 * set 형식
 * $set 덮어쓰기 {dataColName : newData , ...}
 * $inc 더하기 진행 {dataColName : (1 or -1)} //숫자 값에만
 * $mul 곱셈 진행   //숫자 값에만
 * $unset 필드 값 삭제 //해당 데이터를 사용하지 않음
 */
app.put('/edit', async(request,response) =>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
    let reqData = request.body;
    if(reqData.id === null || reqData.id.trim() === ''){
        response.send("잘못된 접근입니다.");
    }else if(reqData.title === null || reqData.title.trim() === ''){
        response.send("제목이 없습니다.");
    }else if(reqData.content === null || reqData.content.trim() === ''){
        response.send("내용이 없습니다.");
    }else if(reqData.title.length > 20){
        response.send("제목은 20자리를 넘을 수 없습니다.");
    }else{
        try{
            await db.collection('post').updateOne({ _id: new ObjectId(reqData.id) },
            {$set : {title : reqData.title, content : reqData.content}});
            response.redirect('/detail/'+reqData.id);
        }catch(e){
            console.log(e);
            response.status(500).send("서버 에러");
        }
    }
})

app.delete('/delete', async (req,res)=>{
    try{
        await db.collection('post').deleteOne({_id: new ObjectId(req.body.id)});
        res.json({isSucceed : true, msg : "성공적으로 삭제하였습니다."});
    }catch(e){
        console.log("Error:", e.response.data);
        console.log("Error:", e.response.status);
        console.log("Error:", e.response.headers);
        res.json({isSucceed: false, msg:"삭제에 실패하였습니다."});
    }
})

app.get('/listData', async (request,response) =>{ // async 함수
    let currentPage = request.query.page;
    let result = await db.collection('post').find().skip((currentPage-1)*listSize).limit(listSize).toArray(); // await은 정해진 곳에서만 쓸 수 있음
    let totalCount = await db.collection('post').countDocuments();
    let pageInfo = setPageInfo(totalCount, currentPage);
    response.json({ result : result, pageInfo : pageInfo ,isSucceed: true});
})

app.get('/list/:page', async (request,response) =>{ // async 함수
    let currentPage = request.params.page;
    let result = await db.collection('post').find().skip((currentPage-1)*listSize).limit(listSize).toArray()
    let totalCount = await db.collection('post').countDocuments();
    let pageInfo = setPageInfo(totalCount, currentPage);
    response.render('list.ejs', { 글목록 : result, pageInfo : pageInfo});
})
// app.get('/list/:page', async (request,response) =>{ // async 함수
//     const listSize = 5;
//     let page = request.params.page-1;
//     let result = await db.collection('post').find({_id : {$gt : 방금마지막본게시물_ID}}).limit(5).toArray()
//     response.render('list.ejs', { 글목록 : result })
// })

// 로그인 검사 로직 : 실행하고 싶으면 passport.authenticate('local')() 사용
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, callback) => {
    try{
        let result = await db.collection('user').findOne({ username : 입력한아이디});
        if (!result) { // 결과 없을 시
        return callback(null, false, { message: '아이디 DB에 없음' });
        }
        // if (result.password == 입력한비번) { // 비밀번호 확인
        if (await bcrypt.compare(입력한비번, result.password)){
        return callback(null, result); // passport.serializeUser의 user 변수에 result 전송
        } else { // 일치하지 않음
        return callback(null, false, { message: '비번불일치' });
        }
    }catch(e){
        return callback(null,false, { message : '서버 에러' });
    }
}))

passport.serializeUser((user, done) => {
    // console.log(user)
    process.nextTick(() => { // nextTick: 내부의 특정 코드를 비동기적으로 처리해줌 (queueMicrotask())
        done(null, { id: user._id, username: user.username }); // 유효 기간은 알아서 처리해줌 기본 2주 (설정 변경 가능)
    }) // 이제 로그인시 세션 document 발행 그리고 그 document의 _id를 쿠키에 적어서 보내줌
})

passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({_id : new ObjectId(user.id)});
    delete result.password;
    process.nextTick(() => {
      done(null, result);
    })
})

app.get('/login', (request,response)=>{
    console.log(request.user);
    response.render('login.ejs');
})

app.post('/login',userValidCheck, async(request, response, next)=>{
    passport.authenticate('local', (error, user, info)=>{// (에러시 들어옴, 성공시 들어옴, 실패시 이유)
        if (error) return response.status(500).json(error);
        if (!user) return response.status(401).json(info.message);
        request.logIn(user,(err)=>{
            if(err) return next(err);
            response.redirect('/');
        })
    })(request, response, next);
})

app.get('/mypage',(request,response) =>{
    let user = request.user;
    console.log(user);
    if(!user) response.status(401).send('잘못된 접근입니다.');
    response.render('mypage.ejs',{정보 : user});
})


app.get('/register',(request,response) =>{

    response.render('register.ejs')
})

app.post('/register',userValidCheck,async(request,response) =>{
    let hashPass = await bcrypt.hash(request.body.password, 10);// data, 몇 번 꼬아줄지 횟수 10번정도가 적당
    let checkDup = await db.collection('user').findOne({username: request.body.username})
    if(checkDup){
         response.status(401).send('아이디 중복');
    }else if(request.body.password != request.body.passcheck){ 
        response.send('비밀번호 확인 불일치');
    }else{
        // 중복, 비밀번호 자릿수 등 예외처리 필수
        await db.collection('user').insertOne({
            username: request.body.username,
            password: hashPass
        })
        response.redirect('/')
    }
})