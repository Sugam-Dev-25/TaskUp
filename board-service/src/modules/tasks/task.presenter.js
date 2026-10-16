const { getUsersByIds } = require('../../utils/userClient');
const { downloadUrl, previewUrl } = require('../../utils/cloudinary');
const timerRepo = require('../timers/timer.repository');
const { parseBlocks } = require('../comments/comment.blocks');
const { canEdit, canDelete } = require('../comments/comment.policy');

function formatAttachment(a, resolve) {
  const isImage = (a.file_type || '').startsWith('image/');
  return {
    id: a.id, fileName: a.file_name, fileUrl: a.file_url,
    downloadUrl: a.public_id ? downloadUrl(a.file_url) : a.file_url,
    previewUrl: isImage ? previewUrl(a.file_url) : null,
    fileType: a.file_type || null,
    size: a.size_bytes != null ? Number(a.size_bytes) : null,
    isImage, uploadedBy: resolve(a.uploaded_by), createdAt: a.created_at || null,
  };
}

const groupBy = (rows) => rows.reduce((m, r) => ((m[r.task_id] ||= []).push(r), m), {});

async function presentTasks(tasks, viewer) {
  if (tasks.length === 0) return [];
  const taskIds = tasks.map((t) => t.id);
  const [sums, actives] = await Promise.all([
    timerRepo.sumByUserForTasks(taskIds),
    timerRepo.findActiveForTasks(taskIds),
  ]);
  const sumsByTask = groupBy(sums);
  const activesByTask = groupBy(actives);

  const usersById = await getUsersByIds([
    ...tasks.flatMap((t) => [
      ...(t.assignedTo || []),
      ...(t.attachments || []).map((a) => a.uploaded_by),
      ...(t.activityLog || []).map((a) => a.user_id),
      ...(t.comments || []).flatMap((c) => [c.user_id, ...(c.attachments || []).map((a) => a.uploaded_by)]),
    ]),
    ...sums.map((r) => r.user_id),
    ...actives.map((r) => r.user_id),
  ]);
  const resolve = (id) => (id ? usersById[id] || { id } : id);

  return tasks.map((t) => ({
    ...t,
    timeManagement: {
      estimated_time: t.estimated_time,
      total_logged_time: t.total_logged_time,
      delay: t.time_delay,
      dailyLogs: [],
      byUser: (sumsByTask[t.id] || []).map((r) => ({ user: resolve(r.user_id), duration: Number(r.total_duration) })),
      activeTimers: (activesByTask[t.id] || []).map((r) => ({ user: resolve(r.user_id), active_start_time: r.active_start_time })),
    },
    assignedTo: (t.assignedTo || []).map(resolve),
    attachments: (t.attachments || []).map((a) => formatAttachment(a, resolve)),
    activityLog: (t.activityLog || []).map((a) => ({ ...a, user: resolve(a.user_id) })),
    comments: (t.comments || []).map((c) => ({
      id: c.id, task_id: c.task_id, user: resolve(c.user_id), text: c.text,
      blocks: parseBlocks(c.blocks),
      attachments: (c.attachments || []).map((a) => formatAttachment(a, resolve)),
      created_at: c.created_at, edited_at: c.edited_at || null,
      can_edit: canEdit(viewer, c), can_delete: canDelete(viewer, c),
    })),
  }));
}

const presentTask = async (task, viewer) => (task ? (await presentTasks([task], viewer))[0] : task);

module.exports = { presentTask, presentTasks };