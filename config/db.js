const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'bakery_booking',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+08:00'
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL 数据库连接成功');
    connection.release();
  } catch (err) {
    console.error('MySQL 数据库连接失败:', err.message);
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection
};
