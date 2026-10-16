const { query } = require('../../config/database');

async function toggle(taskId, userId) {
  const rows = await query('SELECT 1 FROM task_favorites WHERE task_id = ? AND user_id = ?', [taskId, userId]);
  if (rows.length) {
    await query('DELETE FROM task_favorites WHERE task_id = ? AND user_id = ?', [taskId, userId]);
    return false;
  }
  await query('INSERT INTO task_favorites (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
  return true;
}
/** Which of these tasks has this user starred? One query for the whole list. */
async function favoritedSet(taskIds, userId) {
  if (!userId || taskIds.length === 0) return new Set();
  const rows = await query(
    `SELECT task_id FROM task_favorites WHERE user_id = ? AND task_id IN (${taskIds.map(() => '?').join(',')})`,
    [userId, ...taskIds]
  );
  return new Set(rows.map((r) => r.task_id));
}
module.exports = { toggle, favoritedSet };