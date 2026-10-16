const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 4,
  maxIdle: 2,
  idleTimeout: 30000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 15000,
});
pool.pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

const RETRYABLE = new Set(['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'EPIPE', 'ETIMEDOUT']);

// Same signature as pool.execute (resolves to [rows, fields]), so the existing
// `const [rows] = await db.execute(...)` calls keep working untouched.
async function execute(sql, params = []) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await pool.execute(sql, params);
    } catch (err) {
      // SELECT only: re-running a write that may have applied could duplicate it
      if (attempt === 0 && RETRYABLE.has(err.code) && /^\s*select/i.test(sql)) continue;
      throw err;
    }
  }
}

module.exports = {
  pool,
  execute,
  query: async (sql, params) => (await execute(sql, params))[0],
  getConnection: () => pool.getConnection(),
};