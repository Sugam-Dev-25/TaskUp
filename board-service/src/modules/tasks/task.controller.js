const taskRepo = require('./task.repository');
const columnRepo = require('../columns/column.repository');
const boardRepo = require('../boards/board.repository');
const activityRepo = require('../activity/activity.repository');
const attachmentRepo = require('../attachments/attachment.repository');
const { getAccessibleTask } = require('./task.access');
const { presentTask, presentTasks } = require('./task.presenter');
const { destroyFile } = require('../../utils/cloudinary');
const { getUserById, getUsersByIds } = require('../../utils/userClient');
const { notifyUser, notifyAssigned } = require('../../utils/notifyClient');
const templates = require('../../utils/emailTemplates');

const isStaff = (u) => ['manager', 'ceo'].includes(u?.role);
const logErr = (label) => (e) => console.error(`${label}:`, e.message);
const send = async (res, taskId, req, status = 200) =>
  res.status(status).json(await presentTask(await taskRepo.findFull(taskId, req.user.id), req.user));

const createTask = async (req, res) => {
  const { boardId, columnId } = req.params;
  const { title, description, priority, assignedTo, due_date, start_date } = req.body;
  try {
    if (!title || !String(title).trim()) return res.status(400).json({ message: 'Title is required' });
    const board = await boardRepo.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (!board.members.some((m) => String(m) === String(req.user.id))) {
      return res.status(403).json({ message: 'Access Denied: You must be member' });
    }
    const column = await columnRepo.findById(columnId);
    if (!column || String(column.board_id) !== String(boardId)) return res.status(400).json({ message: 'Invalid column' });

    const memberSet = new Set(board.members.map(String));
    const assignees = [...new Set((assignedTo || []).map(String))].filter((id) => memberSet.has(id));

    const newTask = await taskRepo.create({ title: String(title).trim(), description, priority, due_date, start_date, columnId, boardId, assignedTo: assignees });
    await activityRepo.add(newTask.id, { userId: req.user.id, action: 'Task created' });

    Promise.all(
      assignees.filter((id) => id !== String(req.user.id))
        .map((id) => notifyAssigned({ assigneeId: id, actorId: req.user.id, taskTitle: title, boardName: board.name }))
    ).catch(logErr('assign notifications'));

    await send(res, newTask.id, req, 201);
  } catch (error) {
    console.error(`Error creating task for column ${columnId}:`, error);
    res.status(500).json({ message: 'Server Error: Failed to create task' });
  }
};

const moveTask = async (req, res) => {
  const { taskId } = req.params;
  const { newColumnId, newPosition } = req.body;
  try {
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;
    const { task, board } = access;

    // the target column must belong to the same board
    const newCol = await columnRepo.findById(newColumnId);
    if (!newCol || String(newCol.board_id) !== String(task.board_id)) {
      return res.status(400).json({ message: 'Invalid target column' });
    }

    const oldColumnId = task.column_id;
    const changed = String(oldColumnId) !== String(newColumnId);
    const oldCol = changed ? await columnRepo.findById(oldColumnId) : newCol;
    const oldTitle = oldCol?.name || 'Unknown';

    if (changed) {
      await taskRepo.setColumn(taskId, newColumnId);
      await activityRepo.add(taskId, { userId: req.user.id, action: `Moved status from "${oldTitle}" to "${newCol.name}"` });
    } else {
      await activityRepo.add(taskId, { userId: req.user.id, action: `Changed position in ${oldTitle}` });
    }

    // Reindex around the new position (ids only, no full task loads)
    const destIds = (await taskRepo.listIdsInColumn(task.board_id, newColumnId)).filter((id) => String(id) !== String(taskId));
    const pos = Math.max(0, Math.min(Number(newPosition) || 0, destIds.length));
    destIds.splice(pos, 0, taskId);
    await taskRepo.bulkUpdatePositions(destIds.map((id, i) => ({ id, position: i })));
    if (changed) {
      const oldIds = await taskRepo.listIdsInColumn(task.board_id, oldColumnId);
      await taskRepo.bulkUpdatePositions(oldIds.map((id, i) => ({ id, position: i })));

      // Fire-and-forget so the card drops instantly even if email is slow
      (async () => {
        const full = await taskRepo.findFull(taskId);
        const [actor, assignees] = await Promise.all([getUserById(req.user.id), getUsersByIds(full.assignedTo)]);
        await Promise.all(
          Object.values(assignees).filter((u) => String(u.id) !== String(req.user.id) && u.email).map((u) =>
            notifyUser({
              userId: u.id,
              title: 'Task moved',
              message: `"${task.title}" moved from "${oldTitle}" to "${newCol.name}"`,
              email: { to: u.email, ...templates.statusChanged({
                taskTitle: task.title, boardName: board.name, changedBy: actor?.full_name || 'Someone', from: oldTitle, to: newCol.name,
              }) },
            }))
        );
      })().catch(logErr('move notifications'));
    }

    await send(res, taskId, req);
  } catch (error) {
    console.error('moveTask error:', error);
    res.status(500).json({ message: 'Database update failed' });
  }
};

const UPDATE_FIELD_TO_COLUMN = {
  title: null, description: null, priority: null, due_date: 'due_date', start_date: 'start_date',
  progress: null, position: null, estimated_time: 'estimated_time',
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
    const updates = req.body || {};
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;
    const { task, board } = access;

    // Only managers/CEO may change the estimate (you asked for this earlier; it was never enforced server-side)
    if (Object.prototype.hasOwnProperty.call(updates, 'estimated_time') && !isStaff(req.user) &&
        toComparable('estimated_time', updates.estimated_time) !== toComparable('estimated_time', task.estimated_time)) {
      return res.status(403).json({ message: 'Only a manager or the CEO can set the estimated time' });
    }

    for (const key of Object.keys(UPDATE_FIELD_TO_COLUMN)) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      const oldValue = task[UPDATE_FIELD_TO_COLUMN[key] || key];
      const newValue = updates[key];
      if (toComparable(key, oldValue) === toComparable(key, newValue)) continue;
      await activityRepo.add(taskId, {
        userId: req.user.id,
        action: key === 'priority' ? `changed priority from ${oldValue || 'none'} to ${newValue}` : `updated the ${key}`,
        field: key, oldValue, newValue,
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'assignedTo')) {
      const memberSet = new Set(board.members.map(String));
      const newIds = [...new Set((updates.assignedTo || []).map(String))];
      if (!newIds.every((id) => memberSet.has(id))) return res.status(400).json({ message: 'Assignees must be members of this board' });

      const oldIds = ((await taskRepo.findFull(taskId)).assignedTo || []).map(String);
      const addedIds = newIds.filter((id) => !oldIds.includes(id));   // every new assignee, not just the first
      if (addedIds.length) {
        const added = await getUsersByIds(addedIds);
        await activityRepo.add(taskId, {
          userId: req.user.id,
          action: `assigned task to ${addedIds.map((id) => added[id]?.full_name || 'a user').join(', ')}`,
          field: 'assignedTo', oldValue: oldIds, newValue: newIds,
        });
      }
      await taskRepo.setAssignees(taskId, newIds);
      Promise.all(
        addedIds.filter((id) => id !== String(req.user.id))
          .map((id) => notifyAssigned({ assigneeId: id, actorId: req.user.id, taskTitle: task.title, boardName: board.name }))
      ).catch(logErr('assign notifications'));
    }

    await taskRepo.updateFields(taskId, updates);
    await send(res, taskId, req);
  } catch (err) {
    console.error('updateTask error:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;
    const refs = await attachmentRepo.fileRefsForTask(taskId);   // collect before the rows disappear
    await taskRepo.deleteById(taskId);                           // cascades comments, files, logs, timers
    Promise.all(refs.map((r) => destroyFile(r.public_id, r.resource_type))).catch(() => {});
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('deleteTask error:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
};

const getTasks = async (req, res) => {
  try {
    const { scope, boardId, columnId } = req.query;
    let tasks;
    if (boardId && columnId) {
      const board = await boardRepo.findById(boardId);
      if (!board) return res.status(404).json({ message: 'Board not found' });
      if (!board.members.some((m) => String(m) === String(req.user.id))) return res.status(403).json({ message: 'Access denied' });
      tasks = await taskRepo.findByColumnAndBoard(boardId, columnId, req.user.id);
    } else if (scope === 'mine') {
      tasks = await taskRepo.findByAssignee(req.user.id);
    } else if (scope === 'favorites') {
      tasks = await taskRepo.findFavoritesByUser(req.user.id);
    } else {
      const boards = await boardRepo.findByMember(req.user.id);
      tasks = await taskRepo.findByBoards(boards.map((b) => b.id), req.user.id);
    }
    res.status(200).json(await presentTasks(tasks, req.user));
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

module.exports = { createTask, moveTask, updateTask, deleteTask, getTasks };