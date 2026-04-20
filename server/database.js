require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'community_booking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const avatarColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar'
    `);
    
    if (avatarColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''`);
      console.log('已添加 avatar 字段到 users 表');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        capacity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_id INTEGER,
        user_name TEXT NOT NULL,
        user_phone TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        purpose TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_at TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    const userIdColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'user_id'
    `);
    
    if (userIdColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users(id)`);
      console.log('已添加 user_id 字段到 bookings 表');
    }

    const statusColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'status'
    `);
    
    if (statusColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'active'`);
      console.log('已添加 status 字段到 bookings 表');
    }

    const cancelledAtColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
    `);
    
    if (cancelledAtColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE bookings ADD COLUMN cancelled_at TIMESTAMP`);
      console.log('已添加 cancelled_at 字段到 bookings 表');
    }

    const rejectReasonColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'reject_reason'
    `);
    
    if (rejectReasonColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE bookings ADD COLUMN reject_reason TEXT`);
      console.log('已添加 reject_reason 字段到 bookings 表');
    }

    const reviewedAtColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'reviewed_at'
    `);
    
    if (reviewedAtColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE bookings ADD COLUMN reviewed_at TIMESTAMP`);
      console.log('已添加 reviewed_at 字段到 bookings 表');
    }

    const reviewedByColumnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'reviewed_by'
    `);
    
    if (reviewedByColumnCheck.rows.length === 0) {
      await client.query(`ALTER TABLE bookings ADD COLUMN reviewed_by TEXT`);
      console.log('已添加 reviewed_by 字段到 bookings 表');
    } else {
      const columnType = reviewedByColumnCheck.rows[0].data_type;
      if (columnType !== 'text' && columnType !== 'character varying') {
        try {
          const fkConstraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'bookings' 
              AND constraint_type = 'FOREIGN KEY'
              AND constraint_name LIKE '%reviewed_by%'
          `);
          
          for (const constraint of fkConstraintCheck.rows) {
            await client.query(`ALTER TABLE bookings DROP CONSTRAINT ${constraint.constraint_name}`);
            console.log(`已删除外键约束: ${constraint.constraint_name}`);
          }
        } catch (e) {
          console.log('检查或删除外键约束时出错（可能不存在）:', e.message);
        }
        
        try {
          await client.query(`ALTER TABLE bookings ALTER COLUMN reviewed_by TYPE TEXT`);
          console.log('已将 reviewed_by 字段类型修改为 TEXT');
        } catch (e) {
          console.log('修改字段类型时出错:', e.message);
        }
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS room_maintenance (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'normal',
        start_date TEXT NOT NULL,
        start_time TEXT NOT NULL DEFAULT '00:00',
        end_date TEXT NOT NULL,
        end_time TEXT NOT NULL DEFAULT '23:59',
        reason TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )
    `);

    const maintenanceRoomIdColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'room_maintenance' AND column_name = 'room_id'
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_room_maintenance_room ON room_maintenance(room_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_room_maintenance_dates ON room_maintenance(start_date, end_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date)
    `);

    const result = await client.query('SELECT COUNT(*) as count FROM rooms');
    if (parseInt(result.rows[0].count) === 0) {
      const initRooms = [
        { name: '多功能活动室', description: '可用于会议、培训、讲座等多种活动', capacity: 50 },
        { name: '图书阅览室', description: '安静的阅读空间，提供各类图书', capacity: 30 },
        { name: '健身室', description: '配备基本健身器材，适合日常锻炼', capacity: 15 },
        { name: '棋牌室', description: '提供棋牌娱乐设施，适合休闲活动', capacity: 20 },
        { name: '舞蹈室', description: '宽敞的空间，适合舞蹈练习和排练', capacity: 25 }
      ];

      for (const room of initRooms) {
        await client.query(
          'INSERT INTO rooms (name, description, capacity) VALUES ($1, $2, $3)',
          [room.name, room.description, room.capacity]
        );
      }
      console.log('初始化活动室数据完成');
    }
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

const convertParams = (sql, params) => {
  let paramIndex = 1;
  const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { sql: convertedSql, params };
};

const query = async (sql, params = []) => {
  const { sql: convertedSql, params: convertedParams } = convertParams(sql, params);
  const result = await pool.query(convertedSql, convertedParams);
  return result.rows;
};

const queryOne = async (sql, params = []) => {
  const { sql: convertedSql, params: convertedParams } = convertParams(sql, params);
  const result = await pool.query(convertedSql, convertedParams);
  return result.rows[0] || null;
};

const run = async (sql, params = []) => {
  const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
  const { sql: convertedSql, params: convertedParams } = convertParams(sql, params);

  if (isInsert) {
    const returningSql = convertedSql + ' RETURNING id';
    const result = await pool.query(returningSql, convertedParams);
    return {
      lastID: result.rows[0]?.id,
      changes: result.rowCount
    };
  } else {
    const result = await pool.query(convertedSql, convertedParams);
    return {
      lastID: null,
      changes: result.rowCount
    };
  }
};

module.exports = {
  initDb,
  query,
  queryOne,
  run,
  pool
};
