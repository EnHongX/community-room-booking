const express = require('express');
const router = express.Router();
const { createSession, deleteSession } = require('../redis');
const { extractSessionId, adminAuthMiddleware } = require('../middleware/auth');
const db = require('../database');

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

router.get('/rooms', adminAuthMiddleware, async (req, res) => {
  try {
    const rooms = await db.query('SELECT * FROM rooms ORDER BY id');
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('获取活动室列表失败:', error);
    res.status(500).json({ success: false, message: '获取活动室列表失败' });
  }
});

router.get('/rooms/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    
    if (!room) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('获取活动室详情失败:', error);
    res.status(500).json({ success: false, message: '获取活动室详情失败' });
  }
});

router.post('/rooms', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, capacity } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '活动室名称为必填项' });
    }
    
    if (!capacity || capacity <= 0) {
      return res.status(400).json({ success: false, message: '容纳人数必须大于0' });
    }
    
    const result = await db.run(
      'INSERT INTO rooms (name, description, capacity) VALUES (?, ?, ?)',
      [name, description || '', capacity]
    );
    
    res.status(201).json({
      success: true,
      message: '活动室创建成功',
      data: {
        id: result.lastID,
        name,
        description,
        capacity
      }
    });
  } catch (error) {
    console.error('创建活动室失败:', error);
    res.status(500).json({ success: false, message: '创建活动室失败，请稍后重试' });
  }
});

router.put('/rooms/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, capacity } = req.body;
    
    const existingRoom = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (capacity !== undefined) {
      if (capacity <= 0) {
        return res.status(400).json({ success: false, message: '容纳人数必须大于0' });
      }
      updates.capacity = capacity;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }
    
    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    
    await db.run(`UPDATE rooms SET ${setClauses} WHERE id = ?`, values);
    
    const updatedRoom = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '活动室更新成功',
      data: updatedRoom
    });
  } catch (error) {
    console.error('更新活动室失败:', error);
    res.status(500).json({ success: false, message: '更新活动室失败，请稍后重试' });
  }
});

router.delete('/rooms/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingRoom = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    const bookings = await db.query('SELECT * FROM bookings WHERE room_id = ? AND status = ?', [id, 'active']);
    if (bookings.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '该活动室存在未完成的预约，无法删除' 
      });
    }
    
    await db.run('DELETE FROM rooms WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '活动室删除成功'
    });
  } catch (error) {
    console.error('删除活动室失败:', error);
    res.status(500).json({ success: false, message: '删除活动室失败，请稍后重试' });
  }
});

router.get('/bookings', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, start_date, end_date, page = 1, page_size = 20 } = req.query;
    
    let sql = `
      SELECT b.*, r.name as room_name, u.email as user_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];
    
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
      countParams.push(status);
    }
    
    if (start_date) {
      sql += ' AND b.date >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    
    if (end_date) {
      sql += ' AND b.date <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }
    
    const countSql = `
      SELECT COUNT(*) as total 
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
      ${status ? ' AND b.status = ?' : ''}
      ${start_date ? ' AND b.date >= ?' : ''}
      ${end_date ? ' AND b.date <= ?' : ''}
    `;
    
    const countResult = await db.queryOne(countSql, countParams);
    const total = parseInt(countResult.total);
    
    sql += ' ORDER BY b.created_at DESC';
    
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), offset);
    
    const bookings = await db.query(sql, params);
    
    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          page_size: parseInt(page_size),
          total,
          total_pages: Math.ceil(total / parseInt(page_size))
        }
      }
    });
  } catch (error) {
    console.error('获取预约列表失败:', error);
    res.status(500).json({ success: false, message: '获取预约列表失败' });
  }
});

router.get('/bookings/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await db.queryOne(`
      SELECT b.*, r.name as room_name, r.description as room_description, r.capacity as room_capacity, u.email as user_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [id]);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('获取预约详情失败:', error);
    res.status(500).json({ success: false, message: '获取预约详情失败' });
  }
});

router.put('/bookings/:id/approve', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [id]);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }
    
    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: '只有待处理状态的预约可以审核' 
      });
    }
    
    await db.run(`
      UPDATE bookings 
      SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
      WHERE id = ?
    `, [adminId, id]);
    
    const updatedBooking = await db.queryOne(`
      SELECT b.*, r.name as room_name, u.email as user_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [id]);
    
    res.json({
      success: true,
      message: '预约已通过',
      data: updatedBooking
    });
  } catch (error) {
    console.error('通过预约失败:', error);
    res.status(500).json({ success: false, message: '通过预约失败，请稍后重试' });
  }
});

router.put('/bookings/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;
    const adminId = req.user.id;
    
    const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [id]);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }
    
    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: '只有待处理状态的预约可以审核' 
      });
    }
    
    await db.run(`
      UPDATE bookings 
      SET status = 'rejected', reject_reason = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
      WHERE id = ?
    `, [reject_reason || null, adminId, id]);
    
    const updatedBooking = await db.queryOne(`
      SELECT b.*, r.name as room_name, u.email as user_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [id]);
    
    res.json({
      success: true,
      message: '预约已驳回',
      data: updatedBooking
    });
  } catch (error) {
    console.error('驳回预约失败:', error);
    res.status(500).json({ success: false, message: '驳回预约失败，请稍后重试' });
  }
});

module.exports = router;
