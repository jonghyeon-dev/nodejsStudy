const router = require('express').Router();

const ObjectId = require('mongodb').ObjectId; //Id 값을 오브젝트 형식으로 변환하여 사용하기 위해 선언
// DB 세팅부
connectDB = require('./../database.js');
let db // 다른 요청에서 connection을 사용하기 위해 db listen 바깥에 선언
connectDB.then((client)=>{
  console.log('boardDB연결성공')
  db = client.db(process.env.DB_NAME) // 연결 데이터베이스 이름
}).catch((err)=>{
  console.log(err)
})

router.get('/write',(request,response)=>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
    return response.render('write.ejs')
})

router.get('/modify/:id', async(request,response)=>{
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

router.put('/edit', async(request,response) =>{
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

router.delete('/delete', async (req,res)=>{
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

// upload.single() 하나만 업로드
// upload.array() 여러개 업로드
//  - ('~',숫자) : 숫자 만큼의 파일까지만 업로드 3일시 4개올리면 오류
router.post('/insert',(request,response) =>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.'); 
    upload.single('img1')(request,response,async (err) =>{
        if(err) return response.send('업로드 에러')
        console.log(request.file);
        console.log(request.file.location);
        try{
            var add = request.body // 클라이언트가 전송한 데이터를 .body를 통해 가져옴 (윗부분 사전 세팅 선언 코드 있음 L7~8)
            if(add.title === null || add.title.trim() === ''){
                response.send("제목이 없습니다.")
            }else if(add.content === null || add.content.trim() === ''){
                response.send("내용이 없습니다.")
            }else if(add.title.length > 20){
                response.send("제목은 20자리를 넘을 수 없습니다.")
            }else{
                // 어떤 데이터가 어떤 형식으로 올 지 모르므로 등록 할 각각의 데이터를 확실하게 표시하여 등록
                // 이미지 저장시 여러개 저장할때면 mongoDB에서는 array 형식으로 저장 가능
                await db.collection('post').insertOne({title : add.title, content : add.content, img:request.file.location}) 
                response.redirect('/list')
            }
        }catch(e){
            console.log(e) //에러 메시지 출력
            response.status(500).send('서버 에러') //서버 에러시 에러코드도 같이 전송해 주는게 좋음
        }
    })
})

router.get('/sub/sports',(request,response)=>{
    return response.send('스포츠 게시판');
})

router.get('/sub/game',(request,response)=>{
    return response.send('게임 게시판');
})

module.exports = router; 