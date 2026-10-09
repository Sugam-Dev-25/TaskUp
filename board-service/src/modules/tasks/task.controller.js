const fs = require('fs');
const path = require('path');
const taskRepo = require('./task.repository');
const columnRepo = require('../columns/column.repository');
const boardRepo = require('../boards/board.repository');
const { getUserById, getUsersByIds } = require('../../utils/userClient');
const { notifyUser, notifyBoardMembers, notifyAssigned } = require('../../utils/notifyClient');
const config = require('../../config/config');
const templates = require('../../utils/emailTemplates');
/** Enrich the string user-ids on a task (assignedTo, comments.user_id, activityLog.user_id, attachments.uploaded_by) with display info. */
async function withUserInfo(task) {
  if (!task) return task;
  const timeByUser = await taskRepo.getTimeByUser(task.id);
  const activeTimers = await taskRepo.getActiveTimersForTask(task.id);
  const ids = [
    ...(task.assignedTo || []),
    ...(task.comments || []).map((c) => c.user_id),
    ...(task.comments || []).flatMap((c) => (c.attachments || []).map((a) => a.uploaded_by)),
    ...(task.activityLog || []).map((a) => a.user_id),
    ...(task.attachments || []).map((a) => a.uploaded_by),
    ...timeByUser.map((t) => t.user_id),
    ...activeTimers.map((t) => t.user_id),
  ];
  const usersById = await getUsersByIds(ids);
  const resolve = (id) => (id ? usersById[id] || { id } : id);

  return {
    ...task,
    timeManagement: {
      estimated_time: task.estimated_time,
      total_logged_time: task.total_logged_time,
      delay: task.time_delay,
      dailyLogs: [],
      byUser: timeByUser.map((t) => ({ user: resolve(t.user_id), duration: Number(t.total_duration) })),
      activeTimers: activeTimers.map((t) => ({ user: resolve(t.user_id), active_start_time: t.active_start_time })),
    },
    assignedTo: (task.assignedTo || []).map(resolve),
    comments: (task.comments || []).map((c) => ({
      ...c, user: resolve(c.user_id),
      attachments: (c.attachments || []).map((a) => ({ ...a, uploadedBy: resolve(a.uploaded_by) })),
    })),
    activityLog: (task.activityLog || []).map((a) => ({ ...a, user: resolve(a.user_id) })),
    attachments: (task.attachments || []).map((a) => ({ ...a, uploadedBy: resolve(a.uploaded_by) })),
  };
}

const createTask = async (req, res) => {
  const { boardId, columnId } = req.params;
  const { title, description, priority, assignedTo, due_date, start_date } = req.body;
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
      due_date,
      start_date,
      columnId,
      boardId,
      assignedTo: assignedTo || [],
    });
    await taskRepo.addActivityLog(newTask.id, { userId: req.user.id, action: 'Task created' });

    if (assignedTo && assignedTo.length) {
      await Promise.all(
        assignedTo
          .filter((id) => String(id) !== String(req.user.id))
          .map((id) => notifyAssigned({ assigneeId: id, actorId: req.user.id, taskTitle: title, boardName: board.name }))
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
        userId: req.user.id,
        action: `Moved status from "${oldColumnTitle}" to "${newCol.name}"`,
      });

      await taskRepo.setColumn(taskId, newColumnId);

      const board = await boardRepo.findById(task.board_id);
      // await notifyBoardMembers({
      //   memberIds: board ? board.members : [],
      //   actorId: req.user.id,
      //   title: 'Task moved',
      //   message: `"${task.title}" moved from "${oldColumnTitle}" to "${newCol.name}"`,
      // });


      const [actor, assignees] = await Promise.all([
        getUserById(req.user.id),
        getUsersByIds((await taskRepo.findFull(taskId)).assignedTo),
      ]);


      await Promise.all(
        Object.values(assignees)
          .filter((u) => u.id !== req.user.id && u.email)
          .map((u) =>
            notifyUser({
              userId: u.id,
              title: 'Task moved',
              message: `"${task.title}" moved from "${oldColumnTitle}" to "${newCol.name}"`,
              email: {
                to: u.email,
                ...templates.statusChanged({
                  taskTitle: task.title,
                  boardName: board?.name,
                  changedBy: actor?.full_name || 'Someone',
                  from: oldColumnTitle,
                  to: newCol.name,
                }),
              },
            })
          )
      );

    } else {
      await taskRepo.addActivityLog(taskId, {
        userId: req.user.id,
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

// task.controller.js
const UPDATE_FIELD_TO_COLUMN = {
  title: null, description: null, priority: null,
  due_date: 'due_date', start_date: 'start_date', progress: null, position: null,
  estimated_time: 'estimated_time',   // ← add, and note field names are now snake_case matching the rest of the file
};

function toDay(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return isNaN(d) ? String(value) : d.toISOString().slice(0, 10);
}

function toComparable(key, value) {
  if (value === null || value === undefined || value === '') return '';
  if (key === 'due_date' || key === 'start_date') return toDay(value);
  if (['estimated_time', 'progress', 'position'].includes(key)) return String(Number(value));
  return String(value);
}
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
      if (toComparable(key, oldValue) === toComparable(key, newValue)) continue;

      let actionText = `updated the ${key}`;
      if (key === 'priority') {
        actionText = `changed priority from ${oldValue || 'none'} to ${newValue}`;
      }
      await taskRepo.addActivityLog(taskId, {
        userId: req.user.id,
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
          userId: req.user.id,
          action: `assigned task to ${user?.full_name || 'a user'}`,
          field: 'assignedTo',
          oldValue: oldIds,
          newValue: newIds,
        });
        const taskBoard = await boardRepo.findById(task.board_id);
        await notifyAssigned({ assigneeId: addedId, actorId: req.user.id, taskTitle: task.title, boardName: taskBoard?.name });
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

    console.log(`User ${req.user.id} deleted task: ${task.title}`);
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
      return res.status(400).json({
        message: 'No data received. Ensure you are using multipart/form-data.',
      });
    }

    const { taskId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        message: 'Comment cannot be empty',
      });
    }

    // Get task
    const task = await taskRepo.findFull(taskId);


    if (!task) {
      return res.status(404).json({
        message: 'Task not found',
      });
    }

    // Get board
    const board = await boardRepo.findById(task.board_id);

    // Files
    const commentAttachments = req.files
      ? req.files.map((file) => ({
        fileName: file.originalname,
        fileUrl: `${config.uploads.baseUrl}/${file.filename}`,
        fileType: file.mimetype,
        uploadedBy: userId,
      }))
      : [];

    // Save comment
    await taskRepo.addComment(taskId, {
      userId,
      text: text || '',
      attachments: commentAttachments,
    });

    // Activity log
    const logAction =
      commentAttachments.length > 0
        ? `added a comment with ${commentAttachments.length} file(s)`
        : `added a comment: "${text?.substring(0, 20)}..."`;

    await taskRepo.addActivityLog(taskId, {
      userId,
      action: logAction,
    });

    // --------------------------------------------------
    // NOTIFY TASK MEMBERS
    // --------------------------------------------------

    // Get users assigned to this task
    // --------------------------------------------------
    // NOTIFY TASK MEMBERS / PREVIOUS COMMENTERS
    // --------------------------------------------------

    const assignedIds = (task.assignedTo || []).map(String);

    const commenterIds = (task.comments || [])
      .map((comment) => comment.user_id)
      .filter(Boolean)
      .map(String);

    const recipientIds = [
      ...new Set([
        ...assignedIds,
        ...commenterIds,
      ]),
    ].filter((id) => id !== String(userId));

    console.log('Comment notify:', {
      assignedIds,
      commenterIds,
      currentUserId: String(userId),
      recipientIds,
    });

    if (recipientIds.length > 0) {
      const [commentAuthor, users] = await Promise.all([
        getUserById(userId),
        getUsersByIds(recipientIds),
      ]);

      console.log('Comment notification users:', users);

      await Promise.all(
        Object.values(users)
          .filter(
            (user) =>
              user?.id &&
              String(user.id) !== String(userId) &&
              user.email
          )
          .map((user) =>
            notifyUser({
              userId: user.id,

              title: 'New comment',

              message: `${commentAuthor?.full_name || 'Someone'
                } commented on "${task.title}"`,

              email: {
                to: user.email,
                ...templates.commentAdded({
                  taskTitle: task.title,
                  boardName: board?.name,
                  commentedBy:
                    commentAuthor?.full_name || 'Someone',
                  comment: text || 'Added an attachment',
                  taskLink: `${config.frontend.url}/tasks/${taskId}`,
                }),
              },
            })
          )
      );
    }


    // Return updated task
    const updated = await taskRepo.findFull(taskId);

    res.status(201).json(await withUserInfo(updated));
  } catch (error) {
    console.error('Critical Save Error:', error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const MAX_SESSION_MS = 8 * 3600000; 
const toggleTimer = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;
  const task = await taskRepo.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const existing = await taskRepo.getActiveTimer(taskId, userId);
  const now = new Date();

  if (existing) {
    const startTime = new Date(existing.active_start_time);
    const rawWorkDone = now.getTime() - startTime.getTime();
const workDone = Math.min(rawWorkDone, MAX_SESSION_MS);

    const deadline = task.due_date ? new Date(task.due_date).getTime() : null;
    const goalMs = (task.estimated_time || 0) * 3600000;
    let sessionDelay = 0;
    if (deadline && now.getTime() > deadline) {
      sessionDelay = startTime.getTime() > deadline ? workDone : now.getTime() - deadline;
    }
    const totalAfterSession = Number(task.total_logged_time) + workDone;
    if (goalMs > 0 && totalAfterSession > goalMs) {
      sessionDelay = Math.max(sessionDelay, totalAfterSession - Math.max(Number(task.total_logged_time), goalMs));
    }

    await taskRepo.updateTimeManagement(taskId, {
      delay: Number(task.time_delay || 0) + sessionDelay,
      total_logged_time: totalAfterSession,
    });
    await taskRepo.stopTimer(taskId, userId);

    const todayStr = now.toISOString().split('T')[0];
    await taskRepo.upsertDailyLog(taskId, userId, todayStr, workDone);
  } else {
    await taskRepo.startTimer(taskId, userId, now);
  }

  const updated = await taskRepo.findFull(taskId);
  res.status(200).json(await withUserInfo(updated));
};

const getTasks = async (req, res) => {
  try {
    const { scope, boardId, columnId } = req.query;

    if (boardId && columnId) {
      const board = await boardRepo.findById(boardId);
      if (!board) return res.status(404).json({ message: 'Board not found' });
      if (!board.members.some((m) => String(m) === String(req.user.id))) {
        return res.status(403).json({ message: 'Access denied' });
      }
      const tasks = await taskRepo.findByColumnAndBoard(boardId, columnId, req.user.id);
      return res.status(200).json(await Promise.all(tasks.map(withUserInfo)));
    }

    if (scope === 'mine') {
      const tasks = await taskRepo.findByAssignee(req.user.id);
      return res.status(200).json(await Promise.all(tasks.map(withUserInfo)));
    }
    // task.controller.js — getTasks, add a branch
if (scope === 'favorites') {
  const tasks = await taskRepo.findFavoritesByUser(req.user.id);
  return res.status(200).json(await Promise.all(tasks.map(withUserInfo)));
}

    const boards = await boardRepo.findByMember(req.user.id);
    const boardIds = boards.map((b) => b.id);
    const tasks = await taskRepo.findByBoards(boardIds, req.user.id);
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
      uploadedBy: req.user.id,
    }));
    await taskRepo.addAttachments(taskId, files);
    await taskRepo.addActivityLog(taskId, { userId: req.user.id, action: `uploaded ${files.length} file(s)` });

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
      userId: req.user.id,
      action: `Deleted attachment: ${attachment?.file_name || 'Unknown'}`,
    });

    const updated = await taskRepo.findFull(taskId);
    res.status(200).json(await withUserInfo(updated));
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};
const toggleFavorite = async (req, res) => {
  try {
    const isFavorited = await taskRepo.toggleFavorite(req.params.taskId, req.user.id);
    res.status(200).json({ is_favorited: isFavorited });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle favorite' });
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
  toggleFavorite
};
