const { query } = require('../../config/database');
const ph = (a) => a.map(() => '?').join(',');

async function add(taskId, { userId, action, field = null, oldValue = null, newValue = null }) {
  await query(
    `INSERT INTO task_activity_log (task_id, user_id, action, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)`,
    [taskId, userId || null, action, field,
     oldValue === undefined ? null : JSON.stringify(oldValue),
     newValue === undefined ? null : JSON.stringify(newValue)]
  );
}
async function findByTaskIds(taskIds) {
  if (!taskIds.length) return [];
  return query(`SELECT * FROM task_activity_log WHERE task_id IN (${ph(taskIds)}) ORDER BY created_at ASC`, taskIds);
}
module.exports = { add, findByTaskIds };