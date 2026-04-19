const express = require('express');
const router = express.Router();
const { createSession, deleteSession } = require('../redis');
const { extractSessionId } = require('../middleware/auth');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '邮箱和密码都是必填项' 
      });
    }
    
    if (email !== ADMIN_EMAIL) {
      return res.status(401).json({ 
        success: false, 
        message: '管理员邮箱或密码错误' 
      });
    }
    
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ 
        success: false, 
        message: '管理员邮箱或密码错误' 
      });
    }
    
    const adminInfo = {
      id: 'admin',
      email: ADMIN_EMAIL,
      isAdmin: true
    };
    
    const sessionId = await createSession(adminInfo);
    
    res.status(200).json({ 
      success: true, 
      message: '管理员登录成功！',
      data: {
        user: adminInfo,
        sessionId: sessionId
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const sessionId = extractSessionId(req);
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    res.status(200).json({
      success: true,
      message: '已退出登录'
    });
  } catch (error) {
    console.error('管理员退出登录失败:', error);
    res.status(500).json({ success: false, message: '退出登录失败，请稍后重试' });
  }
});

router.get('/me', (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未登录，请先登录'
      });
    }
    
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ success: false, message: '获取信息失败，请稍后重试' });
  }
});

module.exports = router;
