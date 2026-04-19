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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
