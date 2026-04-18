const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'booking.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          avatar TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      db.run(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('添加avatar字段失败:', err);
        }
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          capacity INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          user_phone TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          purpose TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON bookings(room_id, date)`);

      db.get('SELECT COUNT(*) as count FROM rooms', (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          const initRooms = [
            { name: '多功能活动室', description: '可用于会议、培训、讲座等多种活动', capacity: 50 },
            { name: '图书阅览室', description: '安静的阅读空间，提供各类图书', capacity: 30 },
            { name: '健身室', description: '配备基本健身器材，适合日常锻炼', capacity: 15 },
            { name: '棋牌室', description: '提供棋牌娱乐设施，适合休闲活动', capacity: 20 },
            { name: '舞蹈室', description: '宽敞的空间，适合舞蹈练习和排练', capacity: 25 }
          ];

          const insertStmt = db.prepare('INSERT INTO rooms (name, description, capacity) VALUES (?, ?, ?)');
          
          initRooms.forEach(room => {
            insertStmt.run(room.name, room.description, room.capacity);
          });
          
          insertStmt.finalize();
          console.log('初始化活动室数据完成');
        }
        resolve();
      });
    });
  });
};

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

module.exports = {
  initDb,
  query,
  queryOne,
  run
};
