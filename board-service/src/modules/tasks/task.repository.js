const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../../config/database');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

async function findFull(id) {
  const task = await findById(id);
  if (!task) return null;
  return attachRelations(task);
}

/** Attaches assignees/comments/attachments/activityLog onto one or more task rows (batched, no N+1 per row type). */
async function attachRelations(tasksOrTask) {
  const isArray = Array.isArray(tasksOrTask);
  const tasks = isArray ? tasksOrTask : [tasksOrTask];
  if (tasks.length === 0) return isArray ? [] : null;

  const ids = tasks.map((t) => t.id);
  const placeholders = ids.map(() => '?').join(',');

  const [assignees, comments, attachments, activity] = await Promise.all([
    query(`SELECT * FROM task_assignees WHERE task_id IN (${placeholders})`, ids),
    query(`SELECT * FROM task_comments WHERE task_id IN (${placeholders}) ORDER BY created_at ASC`, ids),
    query(`SELECT * FROM task_attachments WHERE task_id IN (${placeholders}) ORDER BY created_at ASC`, ids),
    query(`SELECT * FROM task_activity_log WHERE task_id IN (${placeholders}) ORDER BY created_at ASC`, ids),
  ]);

  let commentAttachments = [];
  if (comments.length) {
    const commentIds = comments.map((c) => c.id);
    const cPlaceholders = commentIds.map(() => '?').join(',');
    commentAttachments = await query(
      `SELECT * FROM task_comment_attachments WHERE comment_id IN (${cPlaceholders})`,
      commentIds
    );
  }

  const byTask = (rows) =>
    rows.reduce((acc, row) => {
      (acc[row.task_id] = acc[row.task_id] || []).push(row);
      return acc;
    }, {});

  const assigneesByTask = byTask(assignees);
  const attachmentsByTask = byTask(attachments);
  const activityByTask = byTask(activity);
  const commentsByTask = byTask(comments);
  const attachmentsByComment = commentAttachments.reduce((acc, row) => {
    (acc[row.comment_id] = acc[row.comment_id] || []).push(row);
    return acc;
  }, {});

  const enriched = tasks.map((t) => ({
    ...t,
    assignedTo: (assigneesByTask[t.id] || []).map((r) => r.user_id),
    attachments: attachmentsByTask[t.id] || [],
    activityLog: activityByTask[t.id] || [],
    comments: (commentsByTask[t.id] || []).map((c) => ({
      ...c,
      attachments: attachmentsByComment[c.id] || [],
    })),
  }));

  return isArray ? enriched : enriched[0];
}

async function findByColumnAndBoard(boardId, columnId, userId) {
  const tasks = await query(
    `SELECT 
       t.*,
       EXISTS (
         SELECT 1
         FROM task_favorites f
         WHERE f.task_id = t.id
           AND f.user_id = ?
       ) AS is_favorited
     FROM tasks t
     WHERE t.board_id = ?
       AND t.column_id = ?
     ORDER BY t.position ASC`,
    [userId, boardId, columnId]
  );

  return attachRelations(tasks);
}


async function findByAssignee(userId) {
  const tasks = await query(
    `SELECT t.* FROM tasks t
     JOIN task_assignees a ON a.task_id = t.id
     WHERE a.user_id = ?
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return attachRelations(tasks);
}

async function findByBoards(boardIds, userId) {
  if (!boardIds.length) return [];

  const placeholders = boardIds.map(() => '?').join(',');

  const tasks = await query(
    `SELECT 
       t.*,
       EXISTS (
         SELECT 1
         FROM task_favorites f
         WHERE f.task_id = t.id
           AND f.user_id = ?
       ) AS is_favorited
     FROM tasks t
     WHERE t.board_id IN (${placeholders})
     ORDER BY t.created_at DESC`,
    [userId, ...boardIds]
  );

  return attachRelations(tasks);
}


// task.repository.js
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

async function addActivityLog(taskId, { userId, action, field = null, oldValue = null, newValue = null }) {
  await query(
    `INSERT INTO task_activity_log (task_id, user_id, action, field, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      userId || null,
      action,
      field,
      oldValue === undefined ? null : JSON.stringify(oldValue),
      newValue === undefined ? null : JSON.stringify(newValue),
    ]
  );
}

async function addComment(taskId, { userId, text, attachments = [] }) {
  const commentId = uuidv4();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT INTO task_comments (id, task_id, user_id, text) VALUES (?, ?, ?, ?)', [
      commentId,
      taskId,
      userId || null,
      text || '',
    ]);
    for (const att of attachments) {
      await conn.execute(
        `INSERT INTO task_comment_attachments (id, comment_id, file_name, file_url, file_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), commentId, att.fileName, att.fileUrl, att.fileType || null, att.uploadedBy || null]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return commentId;
}

async function addAttachments(taskId, files) {
  const conn = await pool.getConnection();
  const inserted = [];
  try {
    await conn.beginTransaction();
    for (const file of files) {
      const id = uuidv4();
      await conn.execute(
        `INSERT INTO task_attachments (id, task_id, file_name, file_url, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
        [id, taskId, file.fileName, file.fileUrl, file.uploadedBy || null]
      );
      inserted.push({ id, ...file });
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return inserted;
}

async function getAttachmentById(attachmentId) {
  const rows = await query('SELECT * FROM task_attachments WHERE id = ?', [attachmentId]);
  return rows[0] || null;
}

async function deleteAttachment(attachmentId) {
  await query('DELETE FROM task_attachments WHERE id = ?', [attachmentId]);
}

async function updateTimeManagement(taskId, fields) {
  const columnMap = {
    estimated_time: 'estimated_time',
    total_logged_time: 'total_logged_time',
    time_delay: 'time_delay',
    active_start_time: 'active_start_time',
    is_running: 'is_running',
  };
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${column} = ?`);
      params.push(fields[key]);
    }
  }
  if (setClauses.length === 0) return;
  params.push(taskId);
  await query(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`, params);
}

async function getDailyLogs(taskId) {
  return query('SELECT log_date, duration FROM task_daily_logs WHERE task_id = ? ORDER BY log_date', [taskId]);
}

async function upsertDailyLog(taskId, userId, dateStr, durationDelta) {
  await query(
    `INSERT INTO task_daily_logs (task_id, user_id, log_date, duration)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE duration = duration + VALUES(duration)`,
    [taskId, userId, dateStr, durationDelta]
  );
}

async function getDailyLogs(taskId) {
  return query('SELECT user_id, log_date, duration FROM task_daily_logs WHERE task_id = ? ORDER BY log_date', [taskId]);
}

/** Per-user total time logged on a task — the "who worked how much" breakdown. */
async function getTimeByUser(taskId) {
  return query(
    `SELECT user_id, SUM(duration) AS total_duration
     FROM task_daily_logs
     WHERE task_id = ?
     GROUP BY user_id`,
    [taskId]
  );
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
async function toggleFavorite(taskId, userId) {
  const rows = await query('SELECT 1 FROM task_favorites WHERE task_id = ? AND user_id = ?', [taskId, userId]);
  if (rows.length) {
    await query('DELETE FROM task_favorites WHERE task_id = ? AND user_id = ?', [taskId, userId]);
    return false;
  }
  await query('INSERT INTO task_favorites (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
  return true;
}

async function getActiveTimer(taskId, userId) {
  const rows = await query('SELECT * FROM task_active_timers WHERE task_id = ? AND user_id = ?', [taskId, userId]);
  return rows[0] || null;
}
async function startTimer(taskId, userId, startTime) {
  await query(
    'INSERT INTO task_active_timers (task_id, user_id, active_start_time) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE active_start_time = VALUES(active_start_time)',
    [taskId, userId, startTime]
  );
}
async function stopTimer(taskId, userId) {
  await query('DELETE FROM task_active_timers WHERE task_id = ? AND user_id = ?', [taskId, userId]);
}
async function getActiveTimersForTask(taskId) {
  return query('SELECT user_id, active_start_time FROM task_active_timers WHERE task_id = ?', [taskId]);
}

// task.repository.js — add
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
  addActivityLog,
  addComment,
  addAttachments,
  getAttachmentById,
  deleteAttachment,
  updateTimeManagement,
  upsertDailyLog,
  getDailyLogs,
  attachRelations,
  getTimeByUser,
  toggleFavorite,
  getActiveTimer,
  startTimer,
  stopTimer,
  getActiveTimersForTask,
  findFavoritesByUser
};
