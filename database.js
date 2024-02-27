const { MongoClient } = require('mongodb'); //MongoDb 사용
// DB 세팅부
const url = process.env.DB_URL; //mongodb사이트에 있는 DataBase Connect에 있는 DB 접속 URL (password 부분 입력 확인)
//let db // 다른 요청에서 connection을 사용하기 위해 db listen 바깥에 선언
let connectDB = new MongoClient(url).connect();

module.exports = connectDB;