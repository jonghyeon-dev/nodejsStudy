/**
 * npm install express          // express 서버 가동용
 * npm install nodemon -g	    // 내용 수정시 자동재실행(노드몬은 글로벌 npm 으로 설치해야 하므로 -g를 꼭 붙여야함.)
 * npm install ejs              // ejs 문법 및 파일 사용을 위해 
 * npm install method-override  // form tag 에서 put delete 를 사용하기 위해 설치
 */

//서버 선언부
const express = require('express') // express 라이브러리 사용하겠다는 뜻
const app = express()
app.use(express.static(__dirname + '/static')) // 폴더를 서버 파일에 등록
//response(요청).body 사용을 위한 세팅
app.use(express.json())//json 형식
app.use(express.urlencoded({extended:true})) // 필수

// ejs 선언부
app.set('view engine', 'ejs') // ejs 세팅 (ejs는 views 폴더를 만들고 .ejs 파일로 만들어서 사용)



// MethodOverride 사용을 위한 선언부
const methodOverride = require('method-override') 
app.use(methodOverride('_method')) 

// DB 세팅부
const { MongoClient } = require('mongodb') //MongoDb 사용
const ObjectId = require('mongodb').ObjectId; //Id 값을 오브젝트 형식으로 변환하여 사용하기 위해 선언
const {dbUrl,dbName} = require('./database.js') // 데이터 베이스 정보파일에서 데이터베이스 정보 가져오기

const url = dbUrl //mongodb사이트에 있는 DataBase Connect에 있는 DB 접속 URL (password 부분 입력 확인)
let db // 다른 요청에서 connection을 사용하기 위해 db listen 바깥에 선언
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db(dbName) // 연결 데이터베이스 이름
  app.listen(8080,()=>{
    console.log('http://localhost:8080 에서 서버 실행 중') 
    })
}).catch((err)=>{
  console.log(err)
})

app.get('/',(request, response) =>{
    response.render('index.ejs') // html화면 전송 시 sendFile 사용, __dirname: 현재 프로잭트 절대경로
})

app.get('/about',(request, response) =>{
    response.sendFile(__dirname + '/about.html')
})

app.get('/getInst',(request, response) =>{
    db.collection('post').insertOne({title : '제목입니다.',content : '내용입니다.'})
    response.send('데이터가 등록되었습니다.')
})

app.get('/list', async (request,response) =>{ // async 함수
    let result = await db.collection('post').find().toArray() // await은 정해진 곳에서만 쓸 수 있음
    //response.send(result[0].title) // 참고 응답을 한번만 사용가능(send,sendFile,render,redirect)
    response.render('list.ejs', { 글목록 : result })
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
    response.render('write.ejs')
})

app.post('/insert', async (request,response) =>{
    //console.log(request.body)
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
 * db update 명령어 정보
 * where 조건
 * updateOne({dataColName : data},set형식) //일치하는 하나의 데이터만
 * update({dataColName : data},set형식) //일치하는 전체의 데이터
 * updateMany(({dataColName : data} {조건식1 : data 혹은 {조건식2 : data}},set형식)) // 조건식사용가능
 *  - 조건식 (상세한 내용은 검색으로 찾아볼수 있음)
 *   - like
 *     - $gt  >
 *     - $gte >=
 *     - &lt  <
 *     - $lte <=
 *     - $ne  !=
 * set 형식
 * $set 덮어쓰기 {dataColName : newData , ...}
 * $inc 더하기 진행 {dataColName : (1 or -1)} //숫자 값에만
 * $mul 곱셈 진행   //숫자 값에만
 * $unset 필드 값 삭제 //해당 데이터를 사용하지 않음
 */
app.put('/edit', async(request,response) =>{
    let reqData = request.body
    if(reqData.id === null || reqData.id.trim() === ''){
        response.send("잘못된 접근입니다.")
    }else if(reqData.title === null || reqData.title.trim() === ''){
        response.send("제목이 없습니다.")
    }else if(reqData.content === null || reqData.content.trim() === ''){
        response.send("내용이 없습니다.")
    }else if(reqData.title.length > 20){
        response.send("제목은 20자리를 넘을 수 없습니다.")
    }else{
        try{
            await db.collection('post').updateOne({ _id: new ObjectId(reqData.id) },
            {$set : {title : reqData.title, content : reqData.content}})
            response.redirect('/list')
        }catch(e){
            console.log(e)
            response.status(500).send("서버 에러")
        }
    }
})

app.post('/delete', async (req,res)=>{
    console.log(req.body)
    try{
        await db.collection('post').deleteOne({_id: new ObjectId(req.body.id)})
        res.json({isSucceed : true, msg : "성공적으로 삭제하였습니다."})
    }catch(e){
        console.log("Error:", e.response.data)
        console.log("Error:", e.response.status)
        console.log("Error:", e.response.headers)
        res.json({isSucceed: false, msg:"삭제에 실패하였습니다."})
    }
})

app.get('/abc/:id', (request,response)=>{
    console.log(request.params)
})

app.get('/listData', async (request,response) =>{ // async 함수
    let result = await db.collection('post').find().toArray() // await은 정해진 곳에서만 쓸 수 있음
    response.json({ result : result ,isSucceed: true})
})