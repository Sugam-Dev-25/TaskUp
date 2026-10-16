const { v4: uuidv4 } = require('uuid');
const { pool, query } = require('../../config/database');
const ph = (a) => a.map(() => '?').join(',');

async function attachFiles(comments) {
  if (comments.length === 0) return [];
  const ids = comments.map((c) => c.id);
  const files = await query(`SELECT * FROM task_comment_attachments WHERE comment_id IN (${ph(ids)})`, ids);
  const byComment = files.reduce((m, f) => ((m[f.comment_id] ||= []).push(f), m), {});
  return comments.map((c) => ({ ...c, attachments: byComment[c.id] || [] }));
}

async function findByTaskIds(taskIds) {
  if (!taskIds.length) return [];
  const rows = await query(`SELECT * FROM task_comments WHERE task_id IN (${ph(taskIds)}) ORDER BY created_at ASC`, taskIds);
  return attachFiles(rows);
}

async function findById(commentId) {
  const rows = await query('SELECT * FROM task_comments WHERE id = ?', [commentId]);
  return rows[0] ? (await attachFiles([rows[0]]))[0] : null;
}

async function create(taskId, { userId, text, blocks = null, attachments = [] }) {
  const commentId = uuidv4();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO task_comments (id, task_id, user_id, text, blocks) VALUES (?, ?, ?, ?, ?)',
      [commentId, taskId, userId || null, text || '', blocks ? JSON.stringify(blocks) : null]
    );
    for (const a of attachments) {
      await conn.execute(
        `INSERT INTO task_comment_attachments
           (id, comment_id, file_name, file_url, file_type, size_bytes, public_id, resource_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, commentId, a.fileName, a.fileUrl, a.fileType || null, a.sizeBytes ?? null, a.publicId || null, a.resourceType || null, a.uploadedBy || null]
      );
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  return commentId;
}

async function update(commentId, { text, blocks, removeAttachmentIds = [] }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'UPDATE task_comments SET text = ?, blocks = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
      [text, JSON.stringify(blocks), commentId]
    );
    if (removeAttachmentIds.length) {
      await conn.execute(
        `DELETE FROM task_comment_attachments WHERE comment_id = ? AND id IN (${ph(removeAttachmentIds)})`,
        [commentId, ...removeAttachmentIds]
      );
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

// task_comment_attachments rows go with it (ON DELETE CASCADE)
async function remove(commentId) { await query('DELETE FROM task_comments WHERE id = ?', [commentId]); }

module.exports = { findByTaskIds, findById, create, update, remove };