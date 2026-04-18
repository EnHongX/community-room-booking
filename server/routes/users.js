const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '邮箱和密码都是必填项' 
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: '请输入有效的邮箱地址' 
      });
    }
    
    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '该邮箱未注册，请先注册账户' 
      });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: '密码错误，请检查密码后重新输入' 
      });
    }
    
    const userInfo = {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    };
    
    res.status(200).json({ 
      success: true, 
      message: '登录成功！',
      data: userInfo
    });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '邮箱和密码都是必填项' 
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: '请输入有效的邮箱地址' 
      });
    }
    
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false, 
        message: '密码长度至少为6位' 
      });
    }
    
    const existingUser = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: '该邮箱已被注册，请使用其他邮箱' 
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const result = await db.run(`
      INSERT INTO users (email, password)
      VALUES (?, ?)
    `, [email, hashedPassword]);
    
    const newUser = await db.queryOne(`
      SELECT id, email, created_at 
      FROM users 
      WHERE id = ?
    `, [result.lastID]);
    
    res.status(201).json({ 
      success: true, 
      message: '注册成功！欢迎加入我们',
      data: newUser
    });
  } catch (error) {
    console.error('用户注册失败:', error);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

module.exports = router;
