const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

async function create({ name, boardId }) {
  const id = uuidv4();
  await query('INSERT INTO columns (id, board_id, name) VALUES (?, ?, ?)', [id, boardId, name]);
  return findById(id);
}

async function findById(id) {
  const rows = await query('SELECT * FROM columns WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByBoard(boardId) {
  return query('SELECT * FROM columns WHERE board_id = ? ORDER BY order_index IS NULL, order_index', [boardId]);
}

async function deleteById(id) {
  // ON DELETE CASCADE removes the column's tasks (and each task's
  // comments/attachments/activity/daily logs) automatically.
  await query('DELETE FROM columns WHERE id = ?', [id]);
}

module.exports = { create, findById, findByBoard, deleteById };
