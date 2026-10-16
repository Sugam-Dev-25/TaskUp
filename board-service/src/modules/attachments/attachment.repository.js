const { pool, query } = require('../../config/database');
const ph = (a) => a.map(() => '?').join(',');

async function findByTaskIds(taskIds) {
  if (!taskIds.length) return [];
  return query(`SELECT * FROM task_attachments WHERE task_id IN (${ph(taskIds)}) ORDER BY created_at ASC`, taskIds);
}

async function add(taskId, files) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const f of files) {
      await conn.execute(
        `INSERT INTO task_attachments
           (id, task_id, file_name, file_url, file_type, size_bytes, public_id, resource_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.id, taskId, f.fileName, f.fileUrl, f.fileType || null, f.sizeBytes ?? null, f.publicId || null, f.resourceType || null, f.uploadedBy || null]
      );
    }
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}

async function findById(id) {
  const rows = await query('SELECT * FROM task_attachments WHERE id = ?', [id]);
  return rows[0] || null;
}
async function remove(id) { await query('DELETE FROM task_attachments WHERE id = ?', [id]); }

/** Every Cloudinary asset of a task (direct + inside comments), for cleanup. */
async function fileRefsForTask(taskId) {
  const [direct, inComments] = await Promise.all([
    query('SELECT public_id, resource_type FROM task_attachments WHERE task_id = ? AND public_id IS NOT NULL', [taskId]),
    query(
      `SELECT a.public_id, a.resource_type FROM task_comment_attachments a
       JOIN task_comments c ON c.id = a.comment_id
       WHERE c.task_id = ? AND a.public_id IS NOT NULL`, [taskId]),
  ]);
  return [...direct, ...inComments];
}

module.exports = { findByTaskIds, add, findById, remove, fileRefsForTask };