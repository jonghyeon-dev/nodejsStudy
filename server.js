const express = require('express') // express 라이브러리 사용하겠다는 뜻
const app = express()

app.use(express.static(__dirname + '/static')) // 폴더를 서버 파일에 등록

const { MongoClient } = require('mongodb')
const {dbUrl,dbName} = require('./database.js') // 데이터 베이스 정보파일
let db
const url = dbUrl //mongodb사이트에 있는 DataBase Connect에 있는 DB 접속 URL (password 부분 입력 확인)
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
    response.sendFile(__dirname + '/index.html') // html화면 전송 시 sendFile 사용, __dirname: 현재 프로잭트 절대경로
})

app.get('/about',(request, response) =>{
    response.sendFile(__dirname + '/about.html')
})

app.get('/news',(request, response) =>{
    db.collection('post').insertOne({title : '제목입니다.',content : '내용입니다.'})
    // response.send('오늘의 뉴스는 모시깽이 입니다.')
})

app.get('/shop',function(request, response){
    response.send('쇼핑 페이지 입니다.')
})

app.get('/list', async (request,response) =>{ // async 함수
    let result = await db.collection('post').find().toArray() // await은 정해진 곳에서만 쓸 수 있음
    console.log(result[0])
    response.send('DB에 있던 게시물')
})