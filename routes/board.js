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

// AWS S3 이미지 업로드 세팅
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2', // 서울 리전
  credentials : {
      accessKeyId : process.env.S3_KEY, //
      secretAccessKey : process.env.S3_SECRET //
  }
})

const upload = multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKETNAME,
      key: function (request, file, cb) {
          console.log(request.file);
        cb(null, uuid()) //업로드시 파일명 변경가능
      }
    })
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
        let result = await db.collection('post').findOne({ _id : new ObjectId(id), user: new ObjectId(request.user._id)}) //상단에 ObjectId 함수 선언 필수 (L15)
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
    let user = req.user;
    if(!user) res.status(401).send('잘못된 접근입니다.');
    try{
        await db.collection('post').deleteOne({
            _id: new ObjectId(req.body.id),
            user : new ObjectId(req.user._id)
        });
        res.json({isSucceed : true, msg : "성공적으로 삭제하였습니다."});
    }catch(e){
        console.log("Error:", e.res.data);
        console.log("Error:", e.res.status);
        console.log("Error:", e.res.headers);
        res.json({isSucceed: false, msg:"삭제에 실패하였습니다."});
    }
})

// upload.single() 하나만 업로드
// upload.array() 여러개 업로드
//  - ('~',숫자) : 숫자 만큼의 파일까지만 업로드 3일시 4개올리면 오류
router.post('/insert', upload.single('img1'), async(request,response) =>{
    let user = request.user;
    if(!user) response.status(401).send('잘못된 접근입니다.');
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
            await db.collection('post').insertOne({
                title : add.title, 
                content : add.content, 
                img:request.file ? request.file.location : '',
                user:user._id,
                username:user.username
            }) 
            response.redirect('/list')
        }
    }catch(e){
        console.log(e) //에러 메시지 출력
        response.status(500).send('서버 에러') //서버 에러시 에러코드도 같이 전송해 주는게 좋음
    }
})

router.get('/sub/sports',(request,response)=>{
    return response.send('스포츠 게시판');
})

router.get('/sub/game',(request,response)=>{
    return response.send('게임 게시판');
})

router.post('/addRecom',async(req,res)=>{
    let user = req.user;
    if(!user) response.status(401).send('로그인 없이 댓글을 작성 할 수 없습니다.');
    try{
        var add = req.body // 클라이언트가 전송한 데이터를 .body를 통해 가져옴 (윗부분 사전 세팅 선언 코드 있음 L7~8)
        if(add.postId === null || add.post === ''){
            return res.send("잘못된 정보입니다.")
        }else if(add.content === null || add.content.trim() === ''){
            return res.send("댓글 내용이 없습니다.")
        }else if(add.content.length > 200){
            return res.send("댓글 내용이 너ㅏ무 깁니다. 200자 이내로 작성해 주세요.");
        }else{
            await db.collection('postRecom').insertOne({
                postId : new ObjectId(add.postId), 
                content : add.content, 
                user:user._id,
                username:user.username
            })
            return res.redirect('back');
        }
    }catch(e){
        console.log(e) //에러 메시지 출력
        res.status(500).send('서버 에러') //서버 에러시 에러코드도 같이 전송해 주는게 좋음
    }
})

router.delete('/deleteRecom',async(req,res)=>{
    let user = req.user;
    if(!user) return res.status(401).send('로그인 없이 댓글을 작성 할 수 없습니다.');
    try{
        let isSucceed = false;
        let msg = "삭제에 실패하였습니다."
        if(req.body.id == null || req.body.id.trim() == ''){
            return res.send("잘못된 접근입니다.")
        }else{
            await db.collection("postRecom").deleteOne({
                                        _id:new ObjectId(req.body.id),
                                        user:new ObjectId(user._id)
                                    });
            isSucceed = true;
            msg = "삭제에 성공하였습니다.";
        }
        return res.json({isSucceed: isSucceed, msg: msg});
    }catch(e){
        console.log(e) //에러 메시지 출력
        res.status(500).send('서버 에러') //서버 에러시 에러코드도 같이 전송해 주는게 좋음
    }
})

router.put("/modifyRecom",async(req,res)=>{
    let user = req.user;
    if(!user) return res.status(401).send('잘못된 접근입니다.');
    try{
        let isSucceed = false;
        let msg = "댓글 수정을 실패하였습니다."
        if(req.body.recomId == null || req.body.recomId.trim() == ''){
            return res.send("잘못된 접근입니다.")
        }else{
            await db.collection("postRecom").updateOne({
                _id:new ObjectId(req.body.recomId),
                user:new ObjectId(user._id)
                },
            {
                $set:{
                    content:req.body.content
                }
            });
            isSucceed = true;
            msg = "댓글 수정을 성공하였습니다.";
        }
    }catch(e){
        console.log(e) //에러 메시지 출력
        res.status(500).send('서버 에러') //서버 에러시 에러코드도 같이 전송해 주는게 좋음
    }
    
    res.redirect("back");
})
module.exports = router; 