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
    const { name, description, capacity, open_time, close_time } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '活动室名称为必填项' });
    }
    
    if (!capacity || capacity <= 0) {
      return res.status(400).json({ success: false, message: '容纳人数必须大于0' });
    }
    
    const actualOpenTime = open_time || '08:00';
    const actualCloseTime = close_time || '22:00';
    
    if (!validateTimeFormat(actualOpenTime) || !validateTimeFormat(actualCloseTime)) {
      return res.status(400).json({ success: false, message: '时间格式不正确，应为 HH:MM' });
    }
    
    if (actualOpenTime >= actualCloseTime) {
      return res.status(400).json({ success: false, message: '开放开始时间必须早于结束时间' });
    }
    
    const result = await db.run(
      'INSERT INTO rooms (name, description, capacity, open_time, close_time) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', capacity, actualOpenTime, actualCloseTime]
    );
    
    res.status(201).json({
      success: true,
      message: '活动室创建成功',
      data: {
        id: result.lastID,
        name,
        description,
        capacity,
        open_time: actualOpenTime,
        close_time: actualCloseTime
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
    const { name, description, capacity, open_time, close_time } = req.body;
    
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
    
    const currentOpenTime = open_time !== undefined ? open_time : existingRoom.open_time;
    const currentCloseTime = close_time !== undefined ? close_time : existingRoom.close_time;
    
    if (open_time !== undefined) {
      if (!validateTimeFormat(open_time)) {
        return res.status(400).json({ success: false, message: '开放时间格式不正确，应为 HH:MM' });
      }
      updates.open_time = open_time;
    }
    
    if (close_time !== undefined) {
      if (!validateTimeFormat(close_time)) {
        return res.status(400).json({ success: false, message: '关闭时间格式不正确，应为 HH:MM' });
      }
      updates.close_time = close_time;
    }
    
    if (open_time !== undefined || close_time !== undefined) {
      if (currentOpenTime >= currentCloseTime) {
        return res.status(400).json({ success: false, message: '开放开始时间必须早于结束时间' });
      }
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

router.get('/stats', adminAuthMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalBookingsResult = await db.queryOne('SELECT COUNT(*) as count FROM bookings');
    const totalRoomsResult = await db.queryOne('SELECT COUNT(*) as count FROM rooms');
    const totalUsersResult = await db.queryOne('SELECT COUNT(*) as count FROM users');
    const todayBookingsResult = await db.queryOne(
      'SELECT COUNT(*) as count FROM bookings WHERE date = ?',
      [today]
    );
    
    const stats = {
      total_bookings: parseInt(totalBookingsResult.count) || 0,
      total_rooms: parseInt(totalRoomsResult.count) || 0,
      total_users: parseInt(totalUsersResult.count) || 0,
      today_bookings: parseInt(todayBookingsResult.count) || 0,
      today
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败，请稍后重试' });
  }
});

router.get('/stats/trend', adminAuthMiddleware, async (req, res) => {
  try {
    const { period = 'week', start_date, end_date } = req.query;
    
    let dateFormat, groupBy, limit;
    const today = new Date();
    
    switch (period) {
      case 'month':
        dateFormat = 'YYYY-MM';
        groupBy = 'month';
        limit = 12;
        break;
      case 'year':
        dateFormat = 'YYYY';
        groupBy = 'year';
        limit = 5;
        break;
      case 'week':
      default:
        dateFormat = 'YYYY-MM-DD';
        groupBy = 'day';
        limit = 7;
        break;
    }
    
    let bookingsTrend = [];
    let usersTrend = [];
    let roomsTrend = [];
    
    if (groupBy === 'day') {
      const days = [];
      for (let i = limit - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date.toISOString().split('T')[0]);
      }
      
      const bookingsByDay = await db.query(`
        SELECT date, COUNT(*) as count 
        FROM bookings 
        WHERE date IN (${days.map(() => '?').join(', ')})
        GROUP BY date
        ORDER BY date
      `, days);
      
      const bookingsMap = {};
      bookingsByDay.forEach(item => {
        bookingsMap[item.date] = parseInt(item.count);
      });
      
      days.forEach(date => {
        bookingsTrend.push({
          date,
          bookings: bookingsMap[date] || 0
        });
      });
      
      const usersByDay = await db.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM users 
        WHERE DATE(created_at) IN (${days.map(() => '?').join(', ')})
        GROUP BY DATE(created_at)
        ORDER BY date
      `, days);
      
      const usersMap = {};
      usersByDay.forEach(item => {
        usersMap[item.date] = parseInt(item.count);
      });
      
      days.forEach(date => {
        usersTrend.push({
          date,
          users: usersMap[date] || 0
        });
      });
      
    } else if (groupBy === 'month') {
      const months = [];
      for (let i = limit - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const month = date.toISOString().slice(0, 7);
        months.push(month);
      }
      
      const bookingsByMonth = await db.query(`
        SELECT SUBSTRING(date, 1, 7) as month, COUNT(*) as count 
        FROM bookings 
        WHERE SUBSTRING(date, 1, 7) IN (${months.map(() => '?').join(', ')})
        GROUP BY SUBSTRING(date, 1, 7)
        ORDER BY month
      `, months);
      
      const bookingsMap = {};
      bookingsByMonth.forEach(item => {
        bookingsMap[item.month] = parseInt(item.count);
      });
      
      months.forEach(month => {
        bookingsTrend.push({
          date: month,
          bookings: bookingsMap[month] || 0
        });
      });
      
      const usersByMonth = await db.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count 
        FROM users 
        WHERE TO_CHAR(created_at, 'YYYY-MM') IN (${months.map(() => '?').join(', ')})
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `, months);
      
      const usersMap = {};
      usersByMonth.forEach(item => {
        usersMap[item.month] = parseInt(item.count);
      });
      
      months.forEach(month => {
        usersTrend.push({
          date: month,
          users: usersMap[month] || 0
        });
      });
      
    } else if (groupBy === 'year') {
      const years = [];
      for (let i = limit - 1; i >= 0; i--) {
        const year = today.getFullYear() - i;
        years.push(year.toString());
      }
      
      const bookingsByYear = await db.query(`
        SELECT SUBSTRING(date, 1, 4) as year, COUNT(*) as count 
        FROM bookings 
        WHERE SUBSTRING(date, 1, 4) IN (${years.map(() => '?').join(', ')})
        GROUP BY SUBSTRING(date, 1, 4)
        ORDER BY year
      `, years);
      
      const bookingsMap = {};
      bookingsByYear.forEach(item => {
        bookingsMap[item.year] = parseInt(item.count);
      });
      
      years.forEach(year => {
        bookingsTrend.push({
          date: year,
          bookings: bookingsMap[year] || 0
        });
      });
      
      const usersByYear = await db.query(`
        SELECT TO_CHAR(created_at, 'YYYY') as year, COUNT(*) as count 
        FROM users 
        WHERE TO_CHAR(created_at, 'YYYY') IN (${years.map(() => '?').join(', ')})
        GROUP BY TO_CHAR(created_at, 'YYYY')
        ORDER BY year
      `, years);
      
      const usersMap = {};
      usersByYear.forEach(item => {
        usersMap[item.year] = parseInt(item.count);
      });
      
      years.forEach(year => {
        usersTrend.push({
          date: year,
          users: usersMap[year] || 0
        });
      });
    }
    
    const totalRoomsResult = await db.queryOne('SELECT COUNT(*) as count FROM rooms');
    roomsTrend = [{
      date: today.toISOString().split('T')[0],
      rooms: parseInt(totalRoomsResult.count) || 0
    }];
    
    res.json({
      success: true,
      data: {
        period,
        bookings_trend: bookingsTrend,
        users_trend: usersTrend,
        rooms_trend: roomsTrend
      }
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ success: false, message: '获取趋势数据失败，请稍后重试' });
  }
});

router.get('/announcements', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, page = 1, page_size = 20 } = req.query;
    
    let sql = 'SELECT * FROM announcements WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    
    const countSql = `SELECT COUNT(*) as total FROM announcements WHERE 1=1${status ? ' AND status = ?' : ''}`;
    const countResult = await db.queryOne(countSql, countParams);
    const total = parseInt(countResult.total);
    
    sql += ' ORDER BY created_at DESC';
    
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(page_size), offset);
    
    const announcements = await db.query(sql, params);
    
    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          page: parseInt(page),
          page_size: parseInt(page_size),
          total,
          total_pages: Math.ceil(total / parseInt(page_size))
        }
      }
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({ success: false, message: '获取公告列表失败' });
  }
});

router.get('/announcements/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await db.queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
    
    if (!announcement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    
    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({ success: false, message: '获取公告详情失败' });
  }
});

router.post('/announcements', adminAuthMiddleware, async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const adminId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ success: false, message: '公告标题为必填项' });
    }
    
    if (!content) {
      return res.status(400).json({ success: false, message: '公告内容为必填项' });
    }
    
    if (status && !['pending', 'published', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: '状态必须为: pending, published, cancelled' 
      });
    }
    
    const actualStatus = status || 'pending';
    const publishedAt = actualStatus === 'published' ? 'CURRENT_TIMESTAMP' : null;
    
    let result;
    if (publishedAt) {
      result = await db.run(`
        INSERT INTO announcements (title, content, status, created_by, published_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [title, content, actualStatus, adminId]);
    } else {
      result = await db.run(`
        INSERT INTO announcements (title, content, status, created_by)
        VALUES (?, ?, ?, ?)
      `, [title, content, actualStatus, adminId]);
    }
    
    const newAnnouncement = await db.queryOne('SELECT * FROM announcements WHERE id = ?', [result.lastID]);
    
    res.status(201).json({
      success: true,
      message: '公告创建成功',
      data: newAnnouncement
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    res.status(500).json({ success: false, message: '创建公告失败，请稍后重试' });
  }
});

router.put('/announcements/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;
    const adminId = req.user.id;
    
    const existingAnnouncement = await db.queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!existingAnnouncement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    
    const updates = {};
    if (title !== undefined) {
      if (!title) {
        return res.status(400).json({ success: false, message: '公告标题不能为空' });
      }
      updates.title = title;
    }
    if (content !== undefined) {
      if (!content) {
        return res.status(400).json({ success: false, message: '公告内容不能为空' });
      }
      updates.content = content;
    }
    if (status !== undefined) {
      if (!['pending', 'published', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: '状态必须为: pending, published, cancelled' 
        });
      }
      updates.status = status;
      
      if (status === 'published' && !existingAnnouncement.published_at) {
        updates.published_at = 'CURRENT_TIMESTAMP';
      }
    }
    
    updates.updated_at = 'CURRENT_TIMESTAMP';
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    }
    
    const setClauses = Object.keys(updates).map(key => {
      if (updates[key] === 'CURRENT_TIMESTAMP') {
        return `${key} = CURRENT_TIMESTAMP`;
      }
      return `${key} = ?`;
    }).join(', ');
    
    const values = Object.values(updates).filter(val => val !== 'CURRENT_TIMESTAMP');
    values.push(id);
    
    await db.run(`UPDATE announcements SET ${setClauses} WHERE id = ?`, values);
    
    const updatedAnnouncement = await db.queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '公告更新成功',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({ success: false, message: '更新公告失败，请稍后重试' });
  }
});

router.delete('/announcements/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingAnnouncement = await db.queryOne('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!existingAnnouncement) {
      return res.status(404).json({ success: false, message: '公告不存在' });
    }
    
    await db.run('DELETE FROM announcements WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '公告删除成功'
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({ success: false, message: '删除公告失败，请稍后重试' });
  }
});

module.exports = router;
