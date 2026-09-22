const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../../config/database');

async function create({ name, owner, memberIds = [] }) {
  const id = uuidv4();
  const allMembers = [...new Set([owner, ...memberIds])];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT INTO boards (id, name, owner) VALUES (?, ?, ?)', [id, name, owner]);
    for (const userId of allMembers) {
      await conn.execute('INSERT INTO board_members (board_id, user_id) VALUES (?, ?)', [id, userId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return findById(id);
}

async function findById(id) {
  const rows = await query('SELECT * FROM boards WHERE id = ?', [id]);
  if (!rows[0]) return null;
  const members = await getMembers(id);
  return { ...rows[0], members };
}

async function findByMember(userId) {
  const rows = await query(
    `SELECT b.* FROM boards b
     JOIN board_members bm ON bm.board_id = b.id
     WHERE bm.user_id = ?
     ORDER BY b.created_at DESC`,
    [userId]
  );
  const boards = await Promise.all(
    rows.map(async (b) => ({ ...b, members: await getMembers(b.id) }))
  );
  return boards;
}

async function getMembers(boardId) {
  const rows = await query('SELECT user_id FROM board_members WHERE board_id = ?', [boardId]);
  return rows.map((r) => r.user_id);
}

async function isMember(boardId, userId) {
  const rows = await query('SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ? LIMIT 1', [
    boardId,
    userId,
  ]);
  return rows.length > 0;
}

async function addMember(boardId, userId) {
  await query('INSERT IGNORE INTO board_members (board_id, user_id) VALUES (?, ?)', [boardId, userId]);
}

async function updateName(boardId, name) {
  await query('UPDATE boards SET name = ? WHERE id = ?', [name, boardId]);
}

async function deleteById(boardId) {
  // ON DELETE CASCADE on board_members/columns/tasks(+their children)
  // handles cleanup — no manual multi-table delete needed like the old
  // Board.deleteOne() + Task.deleteMany() + Column.deleteMany() dance.
  await query('DELETE FROM boards WHERE id = ?', [boardId]);
}

module.exports = { create, findById, findByMember, getMembers, isMember, addMember, updateName, deleteById };
