const taskRepo = require('./task.repository');
const boardRepo = require('../boards/board.repository');

/** Loads the task and confirms the caller belongs to its board. Writes the error response itself. */
async function getAccessibleTask(req, res, taskId) {
  const task = await taskRepo.findById(taskId);
  if (!task) { res.status(404).json({ message: 'Task not found' }); return null; }
  const board = await boardRepo.findById(task.board_id);
  if (!board || !board.members.some((m) => String(m) === String(req.user.id))) {
    res.status(403).json({ message: 'You are not a member of this board' });
    return null;
  }
  return { task, board };
}
module.exports = { getAccessibleTask };