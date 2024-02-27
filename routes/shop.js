// 라우터 분리 파일 사용방법
const router = require('express').Router();

// DB 세팅부
connectDB = require('./../database.js');
let db // 다른 요청에서 connection을 사용하기 위해 db listen 바깥에 선언
connectDB.then((client)=>{
  console.log('shopDB연결성공')
  db = client.db(process.env.DB_NAME) // 연결 데이터베이스 이름
}).catch((err)=>{
  console.log(err)
})

router.get('/shirts',async (request,response)=>{
    await db.collection('post').find().toArray();
    response.send('셔츠파는 페이지임');
})

router.get('/pants',(request,response)=>{
    response.send('바지파는 페이지임');
})

module.exports = router; 