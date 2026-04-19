const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

async function checkTimeConflict(roomId, date, startTime, endTime, excludeBookingId = null) {
  let sql = `
    SELECT * FROM bookings 
    WHERE room_id = ? AND date = ?
  `;
  const params = [roomId, date];
  
  if (excludeBookingId) {
    sql += ' AND id != ?';
    params.push(excludeBookingId);
  }
  
  const existingBookings = await db.query(sql, params);
  
  for (const booking of existingBookings) {
    const existingStart = booking.start_time;
    const existingEnd = booking.end_time;
    
    if (startTime < existingEnd && endTime > existingStart) {
      return {
        conflict: true,
        conflictingBooking: booking
      };
    }
  }
  
  return { conflict: false };
}

function validateTimeFormat(time) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

function validateDateFormat(date) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
}

router.get('/', async (req, res) => {
  try {
    const { room_id, date } = req.query;
    
    let sql = `
      SELECT b.*, r.name as room_name 
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];
    
    if (room_id) {
      sql += ' AND b.room_id = ?';
      params.push(room_id);
    }
    
    if (date) {
      sql += ' AND b.date = ?';
      params.push(date);
    }
    
    sql += ' ORDER BY b.date, b.start_time';
    
    const bookings = await db.query(sql, params);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('获取预约列表失败:', error);
    res.status(500).json({ success: false, message: '获取预约列表失败' });
  }
});

router.get('/check-conflict', async (req, res) => {
  try {
    const { room_id, date, start_time, end_time } = req.query;
    
    if (!room_id || !date || !start_time || !end_time) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数: room_id, date, start_time, end_time' 
      });
    }
    
    if (!validateDateFormat(date)) {
      return res.status(400).json({ 
        success: false, 
        message: '日期格式不正确，应为 YYYY-MM-DD' 
      });
    }
    
    if (!validateTimeFormat(start_time) || !validateTimeFormat(end_time)) {
      return res.status(400).json({ 
        success: false, 
        message: '时间格式不正确，应为 HH:MM' 
      });
    }
    
    if (start_time >= end_time) {
      return res.status(400).json({ 
        success: false, 
        message: '开始时间必须早于结束时间' 
      });
    }
    
    const result = await checkTimeConflict(room_id, date, start_time, end_time);
    res.json({ 
      success: true, 
      data: {
        hasConflict: result.conflict,
        conflictingBooking: result.conflictingBooking
      }
    });
  } catch (error) {
    console.error('检查时间冲突失败:', error);
    res.status(500).json({ success: false, message: '检查时间冲突失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { room_id, user_name, user_phone, date, start_time, end_time, purpose } = req.body;
    
    if (!room_id || !user_name || !user_phone || !date || !start_time || !end_time) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
    }
    
    const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [room_id]);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: '活动室不存在' 
      });
    }
    
    if (!validateDateFormat(date)) {
      return res.status(400).json({ 
        success: false, 
        message: '日期格式不正确，应为 YYYY-MM-DD' 
      });
    }
    
    if (!validateTimeFormat(start_time) || !validateTimeFormat(end_time)) {
      return res.status(400).json({ 
        success: false, 
        message: '时间格式不正确，应为 HH:MM' 
      });
    }
    
    if (start_time >= end_time) {
      return res.status(400).json({ 
        success: false, 
        message: '开始时间必须早于结束时间' 
      });
    }
    
    const conflictResult = await checkTimeConflict(room_id, date, start_time, end_time);
    if (conflictResult.conflict) {
      return res.status(409).json({ 
        success: false, 
        message: '时间冲突，该时段已被预约',
        data: {
          conflictingBooking: conflictResult.conflictingBooking
        }
      });
    }
    
    const userId = req.user.id;
    
    const result = await db.run(`
      INSERT INTO bookings (room_id, user_id, user_name, user_phone, date, start_time, end_time, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [room_id, userId, user_name, user_phone, date, start_time, end_time, purpose || null]);
    
    const newBooking = await db.queryOne(`
      SELECT b.*, r.name as room_name 
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `, [result.lastID]);
    
    res.status(201).json({ 
      success: true, 
      message: '预约成功',
      data: newBooking
    });
  } catch (error) {
    console.error('创建预约失败:', error);
    res.status(500).json({ success: false, message: '创建预约失败' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    
    let sql = `
      SELECT b.*, r.name as room_name 
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = ?
    `;
    const params = [userId];
    
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY b.date DESC, b.start_time DESC';
    
    const bookings = await db.query(sql, params);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('获取用户预约列表失败:', error);
    res.status(500).json({ success: false, message: '获取预约列表失败' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    const booking = await db.queryOne(`
      SELECT b.*, r.name as room_name, r.description as room_description, r.capacity as room_capacity
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ? AND b.user_id = ?
    `, [bookingId, userId]);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '预约不存在或无权访问' 
      });
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('获取预约详情失败:', error);
    res.status(500).json({ success: false, message: '获取预约详情失败' });
  }
});

router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    const booking = await db.queryOne(`
      SELECT * FROM bookings 
      WHERE id = ? AND user_id = ?
    `, [bookingId, userId]);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: '预约不存在或无权访问' 
      });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: '该预约已被取消' 
      });
    }
    
    await db.run(`
      UPDATE bookings 
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [bookingId]);
    
    const updatedBooking = await db.queryOne(`
      SELECT b.*, r.name as room_name 
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `, [bookingId]);
    
    res.json({ 
      success: true, 
      message: '预约已取消',
      data: updatedBooking
    });
  } catch (error) {
    console.error('取消预约失败:', error);
    res.status(500).json({ success: false, message: '取消预约失败' });
  }
});

module.exports = router;
