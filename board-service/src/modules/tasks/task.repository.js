const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../../config/database');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const commentRepo = require('../comments/comment.repository');
const attachmentRepo = require('../attachments/attachment.repository');
const activityRepo = require('../activity/activity.repository');
const favoriteRepo = require('../favorites/favorite.repository');
const ph = (a) => a.map(() => '?').join(',');
function isValidId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}
async function create({ title, description, priority, due_date, start_date, columnId, boardId, assignedTo = [] }) {
  const id = uuidv4();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO tasks (id, title, description, priority, due_date, start_date, column_id, board_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, priority || 'Medium', due_date || null, start_date || null, columnId, boardId]
    );
    for (const userId of assignedTo.filter(isValidId)) {
  await conn.execute('INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [id, userId]);
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
  const rows = await query('SELECT * FROM tasks WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findFull(id, viewerId = null) {
  const task = await findById(id);
  return task ? attachRelations(task, viewerId) : null;
}

async function attachRelations(tasksOrTask, viewerId = null) {
  const isArray = Array.isArray(tasksOrTask);
  const tasks = isArray ? tasksOrTask : [tasksOrTask];
  if (tasks.length === 0) return isArray ? [] : null;
  const ids = tasks.map((t) => t.id);

  const [assignees, comments, attachments, activity, favorited] = await Promise.all([
    query(`SELECT task_id, user_id FROM task_assignees WHERE task_id IN (${ph(ids)})`, ids),
    commentRepo.findByTaskIds(ids),
    attachmentRepo.findByTaskIds(ids),
    activityRepo.findByTaskIds(ids),
    favoriteRepo.favoritedSet(ids, viewerId),
  ]);
  const group = (rows) => rows.reduce((m, r) => ((m[r.task_id] ||= []).push(r), m), {});
  const [a, c, f, l] = [group(assignees), group(comments), group(attachments), group(activity)];

  const enriched = tasks.map((t) => ({
    ...t,
    is_favorited: favorited.has(t.id),        // always a real boolean
    assignedTo: (a[t.id] || []).map((r) => r.user_id),
    comments: c[t.id] || [],
    attachments: f[t.id] || [],
    activityLog: l[t.id] || [],
  }));
  return isArray ? enriched : enriched[0];
}

async function findByColumnAndBoard(boardId, columnId, viewerId = null) {
  const rows = await query('SELECT * FROM tasks WHERE board_id = ? AND column_id = ? ORDER BY position ASC', [boardId, columnId]);
  return attachRelations(rows, viewerId);
}

async function findByAssignee(userId) {
  const rows = await query(
    `SELECT t.* FROM tasks t JOIN task_assignees a ON a.task_id = t.id WHERE a.user_id = ? ORDER BY t.created_at DESC`, [userId]);
  return attachRelations(rows, userId);
}

async function findByBoards(boardIds, viewerId = null) {
  if (!boardIds.length) return [];
  const rows = await query(`SELECT * FROM tasks WHERE board_id IN (${ph(boardIds)}) ORDER BY created_at DESC`, boardIds);
  return attachRelations(rows, viewerId);
}

async function findFavoritesByUser(userId) {
  const rows = await query(
    `SELECT t.* FROM tasks t JOIN task_favorites f ON f.task_id = t.id WHERE f.user_id = ? ORDER BY f.created_at DESC`, [userId]);
  return attachRelations(rows, userId);
}

async function listIdsInColumn(boardId, columnId) {
  const rows = await query('SELECT id FROM tasks WHERE board_id = ? AND column_id = ? ORDER BY position ASC', [boardId, columnId]);
  return rows.map((r) => r.id);
}

const UPDATABLE_COLUMNS = {
  title: 'title', description: 'description', priority: 'priority',
  due_date: 'due_date', start_date: 'start_date', progress: 'progress', position: 'position',
  estimated_time: 'estimated_time',   // ← add
};

async function updateFields(id, updates) {
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return;
  params.push(id);
  await query(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`, params);
}

async function setAssignees(taskId, userIds) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);
    for (const userId of userIds) {
      await conn.execute('INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteById(id) {
  await query('DELETE FROM tasks WHERE id = ?', [id]);
}

async function setColumn(taskId, columnId) {
  await query('UPDATE tasks SET column_id = ? WHERE id = ?', [columnId, taskId]);
}

async function bulkUpdatePositions(rows) {
  // rows: [{ id, position }]
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const { id, position } of rows) {
      await conn.execute('UPDATE tasks SET position = ? WHERE id = ?', [position, id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function setAssignees(taskId, userIds) {
  const validIds = userIds.filter(isValidId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM task_assignees WHERE task_id = ?', [taskId]);
    for (const userId of validIds) {
      await conn.execute('INSERT IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function findFavoritesByUser(userId) {
  const tasks = await query(
    `SELECT t.* FROM tasks t
     JOIN task_favorites f ON f.task_id = t.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return attachRelations(tasks);
}



module.exports = {
  create,
  findById,
  findFull,
  findByColumnAndBoard,
  findByAssignee,
  findByBoards,
  updateFields,
  setAssignees,
  deleteById,
  setColumn,
  bulkUpdatePositions,
  attachRelations,
  findFavoritesByUser,
  listIdsInColumn
};
