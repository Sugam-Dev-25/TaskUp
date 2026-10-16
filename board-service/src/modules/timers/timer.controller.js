const timerRepo = require('./timer.repository');
const { calcSession } = require('./timer.rules');
const taskRepo = require('../tasks/task.repository');
const { getAccessibleTask } = require('../tasks/task.access');
const { presentTask } = require('../tasks/task.presenter');

const conflict = (res, running) =>
  res.status(409).json({
    code: 'TIMER_ALREADY_RUNNING',
    message: running ? `Stop the timer on "${running.task_title}" first.` : 'You already have a timer running.',
    activeTaskId: running?.task_id ?? null,
  });

const toggleTimer = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;
  try {
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;

    const running = await timerRepo.findActiveForUser(userId);
    const sameTask = running && String(running.task_id) === String(taskId);

    if (running && !sameTask) return conflict(res, running);          // one timer at a time

    if (sameTask) {
      await timerRepo.stopAndRecord(taskId, userId, new Date(), calcSession); // null = already stopped, fine
    } else if (!(await timerRepo.start(taskId, userId, new Date()))) {
      return conflict(res, await timerRepo.findActiveForUser(userId));        // lost a race with ourselves
    }

    const full = await taskRepo.findFull(taskId, userId);
    return res.status(200).json(await presentTask(full, req.user));
  } catch (error) {
    console.error('toggleTimer error:', error);
    return res.status(500).json({ message: 'Failed to toggle timer' });
  }
};
const getMyActiveTimer = async (req, res) => {
  try {
    const t = await timerRepo.findActiveForUser(req.user.id);
    res.status(200).json(t ? { taskId: t.task_id, taskTitle: t.task_title, startedAt: t.active_start_time } : null);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load active timer' });
  }
};
module.exports = { toggleTimer, getMyActiveTimer };