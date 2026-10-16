const { pool, query } = require('../../config/database');
const ph = (a) => a.map(() => '?').join(',');

async function findActiveForUser(userId) {
  const rows = await query(
    `SELECT tat.task_id, tat.active_start_time, t.title AS task_title
     FROM task_active_timers tat JOIN tasks t ON t.id = tat.task_id
     WHERE tat.user_id = ? LIMIT 1`, [userId]);
  return rows[0] || null;
}

/** true = started. false = this user already has a timer (the UNIQUE key decides, so parallel clicks can't both win). */
async function start(taskId, userId, startTime) {
  try {
    await query('INSERT INTO task_active_timers (task_id, user_id, active_start_time) VALUES (?, ?, ?)', [taskId, userId, startTime]);
    return true;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return false;
    throw err;
  }
}

async function stopAndRecord(taskId, userId, now, calcSession) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [timers] = await conn.execute(
      'SELECT active_start_time FROM task_active_timers WHERE task_id = ? AND user_id = ? FOR UPDATE', [taskId, userId]);
    if (!timers[0]) { await conn.rollback(); return null; }

    const [tasks] = await conn.execute(
      'SELECT due_date, estimated_time, total_logged_time FROM tasks WHERE id = ? FOR UPDATE', [taskId]);
    const { workDone, sessionDelay } = calcSession(timers[0].active_start_time, now, tasks[0]);

    await conn.execute('DELETE FROM task_active_timers WHERE task_id = ? AND user_id = ?', [taskId, userId]);
    // increments, not "read, add, write": two people stopping at once can't overwrite each other
    await conn.execute(
      'UPDATE tasks SET total_logged_time = total_logged_time + ?, time_delay = time_delay + ? WHERE id = ?',
      [workDone, sessionDelay, taskId]);
    await conn.execute(
      `INSERT INTO task_daily_logs (task_id, user_id, log_date, duration) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE duration = duration + VALUES(duration)`,
      [taskId, userId, now.toISOString().slice(0, 10), workDone]);
    await conn.commit();
    return { workDone, sessionDelay };
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

async function sumByUserForTasks(taskIds) {
  if (!taskIds.length) return [];
  return query(
    `SELECT task_id, user_id, SUM(duration) AS total_duration FROM task_daily_logs
     WHERE task_id IN (${ph(taskIds)}) GROUP BY task_id, user_id`, taskIds);
}
async function findActiveForTasks(taskIds) {
  if (!taskIds.length) return [];
  return query(`SELECT task_id, user_id, active_start_time FROM task_active_timers WHERE task_id IN (${ph(taskIds)})`, taskIds);
}
module.exports = { findActiveForUser, start, stopAndRecord, sumByUserForTasks, findActiveForTasks };