const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const usersRouter = require('./routes/users');
const db = require('./database');
const redis = require('./redis');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常' });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

async function startServer() {
  try {
    await db.initDb();
    console.log('数据库初始化完成');
    
    await redis.checkRedisConnection();
    
    app.listen(PORT, () => {
      console.log(`社区活动室预约系统后端服务已启动`);
      console.log(`服务地址: http://localhost:${PORT}`);
      console.log(`API 文档: `);
      console.log(`  - GET  /api/health          - 健康检查`);
      console.log(`  - POST /api/users/login     - 用户登录`);
      console.log(`  - POST /api/users/logout    - 用户退出登录`);
      console.log(`  - POST /api/users/register  - 用户注册`);
      console.log(`  - GET  /api/rooms           - 获取活动室列表`);
      console.log(`  - GET  /api/rooms/:id       - 获取活动室详情`);
      console.log(`  - GET  /api/bookings        - 获取预约列表`);
      console.log(`  - GET  /api/bookings/check-conflict - 检查时间冲突`);
      console.log(`  - POST /api/bookings        - 创建预约`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
