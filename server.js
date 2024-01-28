const express = require('express') // express 라이브러리 사용하겠다는 뜻
const app = express()

app.listen(8080,()=>{
    console.log('http://localhost:8080 에서 서버 실행 중')
})

app.get('/',(request, response) =>{
    response.sendFile(__dirname + '/index.html') // html화면 전송 시 sendFile 사용, __dirname: 현재 프로잭트 절대경로
})

app.get('/about',(request, response) =>{
    response.sendFile(__dirname + '/about.html')
})

app.get('/news',(request, response) =>{
    response.send('오늘의 뉴스는 모시깽이 입니다.')
})

app.get('/shop',function(request, response){
    response.send('쇼핑 페이지 입니다.')
})