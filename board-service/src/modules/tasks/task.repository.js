const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../../config/database');

async function create({ title, description, priority, dueDate, startDate, columnId, boardId, assignedTo = [] }) {
  const id = uuidv4();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO tasks (id, title, description, priority, due_date, start_date, column_id, board_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description || null, priority || 'Medium', dueDate || null, startDate || null, columnId, boardId]
    );
    for (const userId of assignedTo) {
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

async function findByColumnAndBoard(boardId, columnId) {
  const tasks = await query(
    'SELECT * FROM tasks WHERE board_id = ? AND column_id = ? ORDER BY position ASC',
    [boardId, columnId]
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

async function findByBoards(boardIds) {
  if (!boardIds.length) return [];
  const placeholders = boardIds.map(() => '?').join(',');
  const tasks = await query(
    `SELECT * FROM tasks WHERE board_id IN (${placeholders}) ORDER BY created_at DESC`,
    boardIds
  );
  return attachRelations(tasks);
}

const UPDATABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  priority: 'priority',
  dueDate: 'due_date',
  startDate: 'start_date',
  progress: 'progress',
  position: 'position',
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
    estimatedTime: 'estimated_time',
    totalLoggedTime: 'total_logged_time',
    delay: 'time_delay',
    activeStartTime: 'active_start_time',
    isRunning: 'is_running',
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

async function upsertDailyLog(taskId, dateStr, durationDelta) {
  await query(
    `INSERT INTO task_daily_logs (task_id, log_date, duration)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE duration = duration + VALUES(duration)`,
    [taskId, dateStr, durationDelta]
  );
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
};
