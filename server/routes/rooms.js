const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
  try {
    const rooms = await db.query('SELECT * FROM rooms ORDER BY id');
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('获取活动室列表失败:', error);
    res.status(500).json({ success: false, message: '获取活动室列表失败' });
  }
});

router.get('/:id', async (req, res) => {
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

module.exports = router;
