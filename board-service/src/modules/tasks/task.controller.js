const fs = require('fs');
const path = require('path');
const taskRepo = require('./task.repository');
const columnRepo = require('../columns/column.repository');
const boardRepo = require('../boards/board.repository');
const { getUserById, getUsersByIds } = require('../../utils/userClient');
const { notifyUser, notifyBoardMembers } = require('../../utils/notifyClient');
const config = require('../../config/config');

/** Enrich the string user-ids on a task (assignedTo, comments.user_id, activityLog.user_id, attachments.uploaded_by) with display info. */
async function withUserInfo(task) {
  if (!task) return task;
  const ids = [
    ...(task.assignedTo || []),
    ...(task.comments || []).map((c) => c.user_id),
    ...(task.comments || []).flatMap((c) => (c.attachments || []).map((a) => a.uploaded_by)),
    ...(task.activityLog || []).map((a) => a.user_id),
    ...(task.attachments || []).map((a) => a.uploaded_by),
  ];
  const usersById = await getUsersByIds(ids);
  const resolve = (id) => (id ? usersById[id] || { id } : id);

  return {
    ...task,
    assignedTo: (task.assignedTo || []).map(resolve),
    comments: (task.comments || []).map((c) => ({
      ...c,
      user: resolve(c.user_id),
      attachments: (c.attachments || []).map((a) => ({ ...a, uploadedBy: resolve(a.uploaded_by) })),
    })),
    activityLog: (task.activityLog || []).map((a) => ({ ...a, user: resolve(a.user_id) })),
    attachments: (task.attachments || []).map((a) => ({ ...a, uploadedBy: resolve(a.uploaded_by) })),
  };
}

const createTask = async (req, res) => {
  const { boardId, columnId } = req.params;
  const { title, description, priority, assignedTo, dueDate, startDate } = req.body;
  try {
    const board = await boardRepo.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const isMember = board.members.some((m) => String(m) === String(req.user.id));
    if (!isMember) {
      return res.status(403).json({ message: 'Access Denied: You must be member' });
    }
    const newTask = await taskRepo.create({
      title,
      description,
      priority,
      dueDate,
      startDate,
      columnId,
      boardId,
      assignedTo: assignedTo || [],
    });
    await taskRepo.addActivityLog(newTask.id, { userId: req.user._id, action: 'Task created' });

    if (assignedTo && assignedTo.length) {
      await Promise.all(
        assignedTo.map((userId) =>
          notifyUser({ userId, title: 'New task assigned', message: `You were assigned to "${title}"` })
        )
      );
    }

    const full = await taskRepo.findFull(newTask.id);
    res.status(201).json(await withUserInfo(full));
  } catch (error) {
    console.error(`Error creating task for column ${columnId}:`, error);
    res.status(500).json({ message: 'Server Error: Failed to create task' });
  }
};

const moveTask = async (req, res) => {
  const { newColumnId, newPosition } = req.body;
  const taskId = req.params.taskId;

  try {
    const task = await taskRepo.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldColumnId = task.column_id;
    const oldColumn = await columnRepo.findById(oldColumnId);
    const oldColumnTitle = oldColumn ? oldColumn.name : 'Unknown';

    if (String(oldColumnId) !== String(newColumnId)) {
      const newCol = await columnRepo.findById(newColumnId);

      await taskRepo.addActivityLog(taskId, {
        userId: req.user._id,
        action: `Moved status from "${oldColumnTitle}" to "${newCol.name}"`,
      });

      await taskRepo.setColumn(taskId, newColumnId);

      const board = await boardRepo.findById(task.board_id);
      await notifyBoardMembers({
        memberIds: board ? board.members : [],
        actorId: req.user._id,
        title: 'Task moved',
        message: `"${task.title}" moved from "${oldColumnTitle}" to "${newCol.name}"`,
      });
    } else {
      await taskRepo.addActivityLog(taskId, {
        userId: req.user._id,
        action: `Changed position in ${oldColumnTitle}`,
      });
    }

    // Reindex the destination column's tasks around the new position.
    const destTasks = (await taskRepo.findByColumnAndBoard(task.board_id, newColumnId)).filter(
      (t) => String(t.id) !== String(taskId)
    );
    destTasks.splice(newPosition, 0, { id: taskId });
    await taskRepo.bulkUpdatePositions(destTasks.map((t, i) => ({ id: t.id, position: i })));

    if (String(oldColumnId) !== String(newColumnId)) {
      const oldColTasks = await taskRepo.findByColumnAndBoard(task.board_id, oldColumnId);
      await taskRepo.bulkUpdatePositions(oldColTasks.map((t, i) => ({ id: t.id, position: i })));
    }

    const updated = await taskRepo.findFull(taskId);
    res.status(200).json(await withUserInfo(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database update failed' });
  }
};

const UPDATE_FIELD_TO_COLUMN = {
  title: null,
  description: null,
  priority: null,
  dueDate: 'due_date',
  startDate: 'start_date',
  progress: null,
  position: null,
};

/**
 * Diffs the requested updates against the current task and appends
 * activityLog entries — this used to live in a Mongoose pre('save') hook
 * on the Task model. Moved here explicitly since resolving a user's name
 * for the "assigned to X" log line is an async HTTP call now, which
 * doesn't fit cleanly in a Mongoose-style hook anyway.
 */
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await taskRepo.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    for (const key of Object.keys(UPDATE_FIELD_TO_COLUMN)) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      const column = UPDATE_FIELD_TO_COLUMN[key] || key;
      const oldValue = task[column];
      const newValue = updates[key];
      if (String(oldValue ?? '') === String(newValue ?? '')) continue;

      let actionText = `updated the ${key}`;
      if (key === 'priority') {
        actionText = `changed priority from ${oldValue || 'none'} to ${newValue}`;
      }
      await taskRepo.addActivityLog(taskId, {
        userId: req.user._id,
        action: actionText,
        field: key,
        oldValue,
        newValue,
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'assignedTo')) {
      const current = await taskRepo.findFull(taskId);
      const oldIds = (current.assignedTo || []).map(String);
      const newIds = (updates.assignedTo || []).map(String);
      const addedId = newIds.find((id) => !oldIds.includes(id));

      if (addedId) {
        const user = await getUserById(addedId);
        await taskRepo.addActivityLog(taskId, {
          userId: req.user._id,
          action: `assigned task to ${user?.name || 'a user'}`,
          field: 'assignedTo',
          oldValue: oldIds,
          newValue: newIds,
        });
        await notifyUser({ userId: addedId, title: 'Task assigned', message: `You were assigned to "${task.title}"` });
      }
      await taskRepo.setAssignees(taskId, newIds);
    }

    await taskRepo.updateFields(taskId, updates);

    const updated = await taskRepo.findFull(taskId);
    res.status(200).json(await withUserInfo(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await taskRepo.findById(taskId);
    if (!task) return res.status(404).json('Task already deleted');

    console.log(`User ${req.user._id} deleted task: ${task.title}`);
    // FK ON DELETE CASCADE removes comments/attachments/activity/daily logs.
    await taskRepo.deleteById(taskId);

    res.status(200).json('Task deleted successfully');
  } catch (error) {
    res.status(500).json('Failed to delete task');
  }
};

const addTaskComment = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'No data received. Ensure you are using multipart/form-data.' });
    }
    const { taskId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }

    const task = await taskRepo.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const commentAttachments = req.files
      ? req.files.map((file) => ({
          fileName: file.originalname,
          fileUrl: `${config.uploads.baseUrl}/${file.filename}`,
          fileType: file.mimetype,
          uploadedBy: userId,
        }))
      : [];

    await taskRepo.addComment(taskId, { userId, text: text || '', attachments: commentAttachments });

    const logAction =
      commentAttachments.length > 0
        ? `added a comment with ${commentAttachments.length} file(s)`
        : `added a comment: "${text?.substring(0, 20)}..."`;
    await taskRepo.addActivityLog(taskId, { userId, action: logAction });

    const updated = await taskRepo.findFull(taskId);
    res.status(201).json(await withUserInfo(updated));
  } catch (error) {
    console.error('Critical Save Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const toggleTimer = async (req, res) => {
  const { taskId } = req.params;
  const task = await taskRepo.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const now = new Date();

  if (task.is_running) {
    const startTime = new Date(task.active_start_time);
    const workDone = now.getTime() - startTime.getTime();
    const deadline = task.due_date ? new Date(task.due_date).getTime() : null;
    const goalMs = (task.estimated_time || 0) * 3600000;

    let sessionDelay = 0;
    if (deadline && now.getTime() > deadline) {
      sessionDelay = startTime.getTime() > deadline ? workDone : now.getTime() - deadline;
    }

    const totalAfterSession = Number(task.total_logged_time) + workDone;
    if (goalMs > 0 && totalAfterSession > goalMs) {
      const overtimeInThisSession = totalAfterSession - Math.max(Number(task.total_logged_time), goalMs);
      sessionDelay = Math.max(sessionDelay, overtimeInThisSession);
    }

    await taskRepo.updateTimeManagement(taskId, {
      delay: Number(task.time_delay || 0) + sessionDelay,
      totalLoggedTime: totalAfterSession,
      isRunning: false,
      activeStartTime: null,
    });

    const todayStr = now.toISOString().split('T')[0];
    await taskRepo.upsertDailyLog(taskId, todayStr, workDone);
  } else {
    await taskRepo.updateTimeManagement(taskId, { isRunning: true, activeStartTime: now });
  }

  const updatedTask = await taskRepo.findById(taskId);
  const dailyLogs = await taskRepo.getDailyLogs(taskId);
  res.status(200).json({
    ...updatedTask,
    timeManagement: {
      estimatedTime: updatedTask.estimated_time,
      totalLoggedTime: updatedTask.total_logged_time,
      delay: updatedTask.time_delay,
      activeStartTime: updatedTask.active_start_time,
      isRunning: !!updatedTask.is_running,
      dailyLogs: dailyLogs.map((l) => ({ date: l.log_date, duration: l.duration })),
    },
  });
};

const getTasks = async (req, res) => {
  try {
    const { scope, boardId, columnId } = req.query;

    if (boardId && columnId) {
      const board = await boardRepo.findById(boardId);
      if (!board) return res.status(404).json({ message: 'Board not found' });
      if (!board.members.some((m) => String(m) === String(req.user._id))) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const tasks = await taskRepo.findByColumnAndBoard(boardId, columnId);
      return res.status(200).json(await Promise.all(tasks.map(withUserInfo)));
    }

    if (scope === 'mine') {
      const tasks = await taskRepo.findByAssignee(req.user._id);
      return res.status(200).json(await Promise.all(tasks.map(withUserInfo)));
    }

    const boards = await boardRepo.findByMember(req.user._id);
    const boardIds = boards.map((b) => b.id);
    const tasks = await taskRepo.findByBoards(boardIds);
    res.status(200).json(await Promise.all(tasks.map(withUserInfo)));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

const uploadtaskFile = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await taskRepo.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const files = req.files.map((file) => ({
      fileName: file.originalname,
      fileUrl: `${config.uploads.baseUrl}/${file.filename}`,
      uploadedBy: req.user._id,
    }));
    await taskRepo.addAttachments(taskId, files);
    await taskRepo.addActivityLog(taskId, { userId: req.user._id, action: `uploaded ${files.length} file(s)` });

    const updated = await taskRepo.findFull(taskId);
    res.status(200).json(await withUserInfo(updated));
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
};

const deleteTaskFile = async (req, res) => {
  try {
    const { taskId, fileId } = req.params;
    const task = await taskRepo.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const attachment = await taskRepo.getAttachmentById(fileId);
    if (attachment) {
      const fileName = attachment.file_url.split('/').pop();
      const filePath = path.join(__dirname, '../../uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await taskRepo.deleteAttachment(fileId);
    }

    await taskRepo.addActivityLog(taskId, {
      userId: req.user._id,
      action: `Deleted attachment: ${attachment?.file_name || 'Unknown'}`,
    });

    const updated = await taskRepo.findFull(taskId);
    res.status(200).json(await withUserInfo(updated));
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};

module.exports = {
  uploadtaskFile,
  deleteTaskFile,
  createTask,
  moveTask,
  updateTask,
  deleteTask,
  addTaskComment,
  toggleTimer,
  getTasks,
};
