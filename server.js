/**
 * npm install express
 * npm install ejs
 * npm install nodemon -g	//노드몬은 글로벌 npm 으로 설치해야 하므로 -g를 꼭 붙여야함.
 * 
 */

const express = require('express') // express 라이브러리 사용하겠다는 뜻
const app = express()

app.use(express.static(__dirname + '/static')) // 폴더를 서버 파일에 등록
app.set('view engine', 'ejs') // ejs 세팅 (ejs는 views 폴더를 만들고 .ejs 파일로 만들어서 사용)
//response(요청).body 사용을 위한 세팅
app.use(express.json())//json 형식
app.use(express.urlencoded({extended:true}))//필수

const { MongoClient } = require('mongodb')
const {dbUrl,dbName} = require('./database.js') // 데이터 베이스 정보파일
let db
const url = dbUrl //mongodb사이트에 있는 DataBase Connect에 있는 DB 접속 URL (password 부분 입력 확인)

const ObjectId = require('mongodb').ObjectId; //Id 값을 오브젝트 형식으로 변환하여 사용하기 위해 선언

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

app.get('/write2',(request,response)=>{
    response.render('write2.ejs')
})

app.post('/insertCol2', async (request,response) =>{
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
            await db.collection('col2').insertOne({title : add.title, content : add.content})
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