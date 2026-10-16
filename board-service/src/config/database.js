const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
    maxIdle: 2,
  idleTimeout: 30000,          // drop idle connections before the server does
  queueLimit: 0,
  enableKeepAlive: true,       // TCP keepalive stops idle connections being cut
  keepAliveInitialDelay: 10000,
  connectTimeout: 15000,
});
pool.pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));
const RETRYABLE = new Set(['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'EPIPE', 'ETIMEDOUT']);

async function query(sql, params = []) {
  for (let attempt = 0; ; attempt++) {
    try {
      const [rows] = await pool.execute(sql, params); // keep whichever call you use now
      return rows;
    } catch (err) {
      // SELECT only: re-running a write that may have already applied could duplicate it
      if (attempt === 0 && RETRYABLE.has(err.code) && /^\s*select/i.test(sql)) continue;
      throw err;
    }
  }
}



module.exports = { pool, query };
