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

router.get('/rooms/:id/maintenance', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!room) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    const maintenances = await db.query(`
      SELECT * FROM room_maintenance 
      WHERE room_id = ? 
      ORDER BY created_at DESC
    `, [id]);
    
    res.json({ success: true, data: maintenances });
  } catch (error) {
    console.error('获取活动室维护状态失败:', error);
    res.status(500).json({ success: false, message: '获取维护状态失败' });
  }
});

async function checkMaintenanceConflict(roomId, startDate, startTime, endDate, endTime, excludeMaintenanceId = null) {
  let sql = `
    SELECT * FROM room_maintenance 
    WHERE room_id = ? 
      AND status != 'normal'
      AND (
        (start_date < ? AND end_date > ?)
        OR (start_date = ? AND start_time < ?)
        OR (end_date = ? AND end_time > ?)
        OR (start_date >= ? AND start_date <= ?)
        OR (end_date >= ? AND end_date <= ?)
      )
  `;
  
  const params = [
    roomId, 
    endDate, startDate,
    endDate, endTime,
    startDate, startTime,
    startDate, endDate,
    startDate, endDate
  ];
  
  if (excludeMaintenanceId) {
    sql += ' AND id != ?';
    params.push(excludeMaintenanceId);
  }
  
  const maintenances = await db.query(sql, params);
  return maintenances;
}

async function cancelBookingsInMaintenance(roomId, startDate, startTime, endDate, endTime, adminId, reason) {
  const bookingsToCancel = await db.query(`
    SELECT * FROM bookings 
    WHERE room_id = ? 
      AND status IN ('pending', 'approved', 'active')
      AND (
        (date < ? AND date > ?)
        OR (date = ? AND start_time < ?)
        OR (date = ? AND end_time > ?)
        OR (date >= ? AND date <= ?)
      )
  `, [
    roomId,
    endDate, startDate,
    endDate, endTime,
    startDate, startTime,
    startDate, endDate
  ]);
  
  const cancelledBookings = [];
  
  for (const booking of bookingsToCancel) {
    const bookingStart = booking.date + ' ' + booking.start_time;
    const bookingEnd = booking.date + ' ' + booking.end_time;
    const maintStart = startDate + ' ' + startTime;
    const maintEnd = endDate + ' ' + endTime;
    
    if (bookingStart < maintEnd && bookingEnd > maintStart) {
      await db.run(`
        UPDATE bookings 
        SET status = 'cancelled', 
            cancelled_at = CURRENT_TIMESTAMP, 
            reject_reason = ?
        WHERE id = ?
      `, [reason || '活动室维护/暂停开放，预约已取消', booking.id]);
      
      const updatedBooking = await db.queryOne(`
        SELECT b.*, r.name as room_name
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.id = ?
      `, [booking.id]);
      
      cancelledBookings.push(updatedBooking);
    }
  }
  
  return cancelledBookings;
}

router.post('/rooms/:id/maintenance', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, start_date, start_time, end_date, end_time, reason } = req.body;
    const adminId = req.user.id;
    
    const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!room) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    if (!status || !['normal', 'maintenance', 'suspended'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: '状态必须为: normal, maintenance, suspended' 
      });
    }
    
    if (status !== 'normal') {
      if (!start_date || !end_date) {
        return res.status(400).json({ 
          success: false, 
          message: '维护/暂停状态需要指定开始和结束日期' 
        });
      }
      
      if (!validateDateFormat(start_date) || !validateDateFormat(end_date)) {
        return res.status(400).json({ 
          success: false, 
          message: '日期格式不正确，应为 YYYY-MM-DD' 
        });
      }
      
      if (start_time && !validateTimeFormat(start_time)) {
        return res.status(400).json({ 
          success: false, 
          message: '开始时间格式不正确，应为 HH:MM' 
        });
      }
      
      if (end_time && !validateTimeFormat(end_time)) {
        return res.status(400).json({ 
          success: false, 
          message: '结束时间格式不正确，应为 HH:MM' 
        });
      }
      
      const actualStartTime = start_time || '00:00';
      const actualEndTime = end_time || '23:59';
      
      if (start_date === end_date && actualStartTime >= actualEndTime) {
        return res.status(400).json({ 
          success: false, 
          message: '开始时间必须早于结束时间' 
        });
      }
      
      if (start_date > end_date) {
        return res.status(400).json({ 
          success: false, 
          message: '开始日期不能晚于结束日期' 
        });
      }
    }
    
    let result;
    let cancelledBookings = [];
    
    if (status === 'normal') {
      result = await db.run(`
        INSERT INTO room_maintenance (room_id, status, start_date, start_time, end_date, end_time, reason, created_by)
        VALUES (?, 'normal', CURRENT_DATE, '00:00', CURRENT_DATE, '23:59', ?, ?)
      `, [id, reason || '恢复正常开放', adminId]);
    } else {
      const actualStartTime = start_time || '00:00';
      const actualEndTime = end_time || '23:59';
      
      result = await db.run(`
        INSERT INTO room_maintenance (room_id, status, start_date, start_time, end_date, end_time, reason, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, status, start_date, actualStartTime, end_date, actualEndTime, reason || null, adminId]);
      
      const cancelReason = status === 'maintenance' 
        ? '活动室维护中，预约已取消' 
        : '活动室暂停开放，预约已取消';
      
      cancelledBookings = await cancelBookingsInMaintenance(
        id, start_date, actualStartTime, end_date, actualEndTime, adminId, 
        reason ? `${cancelReason}: ${reason}` : cancelReason
      );
    }
    
    const newMaintenance = await db.queryOne(`
      SELECT * FROM room_maintenance WHERE id = ?
    `, [result.lastID]);
    
    res.status(201).json({
      success: true,
      message: status === 'normal' 
        ? '活动室已恢复正常开放' 
        : (status === 'maintenance' ? '活动室已设置为维护中' : '活动室已暂停开放'),
      data: {
        maintenance: newMaintenance,
        cancelled_bookings: cancelledBookings,
        cancelled_count: cancelledBookings.length
      }
    });
  } catch (error) {
    console.error('设置维护状态失败:', error);
    res.status(500).json({ success: false, message: '设置维护状态失败，请稍后重试' });
  }
});

router.put('/rooms/:id/maintenance/:maintenanceId', adminAuthMiddleware, async (req, res) => {
  try {
    const { id, maintenanceId } = req.params;
    const { status, start_date, start_time, end_date, end_time, reason } = req.body;
    const adminId = req.user.id;
    
    const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!room) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    const existingMaintenance = await db.queryOne(
      'SELECT * FROM room_maintenance WHERE id = ? AND room_id = ?',
      [maintenanceId, id]
    );
    
    if (!existingMaintenance) {
      return res.status(404).json({ success: false, message: '维护记录不存在' });
    }
    
    const updates = {};
    if (status !== undefined) {
      if (!['normal', 'maintenance', 'suspended'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: '状态必须为: normal, maintenance, suspended' 
        });
      }
      updates.status = status;
    }
    if (start_date !== undefined) updates.start_date = start_date;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_date !== undefined) updates.end_date = end_date;
    if (end_time !== undefined) updates.end_time = end_time;
    if (reason !== undefined) updates.reason = reason;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }
    
    if (updates.status && updates.status !== 'normal') {
      const actualStartDate = updates.start_date || existingMaintenance.start_date;
      const actualEndDate = updates.end_date || existingMaintenance.end_date;
      const actualStartTime = updates.start_time || existingMaintenance.start_time;
      const actualEndTime = updates.end_time || existingMaintenance.end_time;
      
      if (!validateDateFormat(actualStartDate) || !validateDateFormat(actualEndDate)) {
        return res.status(400).json({ 
          success: false, 
          message: '日期格式不正确，应为 YYYY-MM-DD' 
        });
      }
      
      if (actualStartDate > actualEndDate) {
        return res.status(400).json({ 
          success: false, 
          message: '开始日期不能晚于结束日期' 
        });
      }
      
      if (actualStartDate === actualEndDate && actualStartTime >= actualEndTime) {
        return res.status(400).json({ 
          success: false, 
          message: '开始时间必须早于结束时间' 
        });
      }
    }
    
    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), maintenanceId, id];
    
    await db.run(`UPDATE room_maintenance SET ${setClauses} WHERE id = ? AND room_id = ?`, values);
    
    const updatedMaintenance = await db.queryOne(
      'SELECT * FROM room_maintenance WHERE id = ?',
      [maintenanceId]
    );
    
    let cancelledBookings = [];
    if (updatedMaintenance.status !== 'normal') {
      const cancelReason = updatedMaintenance.status === 'maintenance' 
        ? '活动室维护中，预约已取消' 
        : '活动室暂停开放，预约已取消';
      
      cancelledBookings = await cancelBookingsInMaintenance(
        id, 
        updatedMaintenance.start_date, 
        updatedMaintenance.start_time, 
        updatedMaintenance.end_date, 
        updatedMaintenance.end_time, 
        adminId, 
        updatedMaintenance.reason ? `${cancelReason}: ${updatedMaintenance.reason}` : cancelReason
      );
    }
    
    res.json({
      success: true,
      message: '维护状态已更新',
      data: {
        maintenance: updatedMaintenance,
        cancelled_bookings: cancelledBookings,
        cancelled_count: cancelledBookings.length
      }
    });
  } catch (error) {
    console.error('更新维护状态失败:', error);
    res.status(500).json({ success: false, message: '更新维护状态失败，请稍后重试' });
  }
});

router.delete('/rooms/:id/maintenance/:maintenanceId', adminAuthMiddleware, async (req, res) => {
  try {
    const { id, maintenanceId } = req.params;
    
    const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [id]);
    if (!room) {
      return res.status(404).json({ success: false, message: '活动室不存在' });
    }
    
    const existingMaintenance = await db.queryOne(
      'SELECT * FROM room_maintenance WHERE id = ? AND room_id = ?',
      [maintenanceId, id]
    );
    
    if (!existingMaintenance) {
      return res.status(404).json({ success: false, message: '维护记录不存在' });
    }
    
    await db.run('DELETE FROM room_maintenance WHERE id = ? AND room_id = ?', [maintenanceId, id]);
    
    res.json({
      success: true,
      message: '维护记录已删除'
    });
  } catch (error) {
    console.error('删除维护记录失败:', error);
    res.status(500).json({ success: false, message: '删除维护记录失败，请稍后重试' });
  }
});

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

module.exports = router;
