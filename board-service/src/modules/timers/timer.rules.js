const HOUR = 3600000;
const MAX_SESSION_MS = 8 * HOUR; // a forgotten timer can't log more than this

function calcSession(startedAt, now, task) {
  const start = new Date(startedAt).getTime();
  const end = now.getTime();
  const workDone = Math.min(Math.max(end - start, 0), MAX_SESSION_MS);

  // NOTE: due_date is stored as midnight, so the due day itself counts as late.
  // Timer.tsx works the same way. Not changed here.
  const deadline = task.due_date ? new Date(task.due_date).getTime() : null;
  let sessionDelay = 0;
  if (deadline && end > deadline) sessionDelay = Math.min(start > deadline ? workDone : end - deadline, workDone);

  const before = Number(task.total_logged_time || 0);
  const goal = Number(task.estimated_time || 0) * HOUR;
  if (goal > 0 && before + workDone > goal) {
    sessionDelay = Math.max(sessionDelay, before + workDone - Math.max(before, goal));
  }
  return { workDone, sessionDelay };
}
module.exports = { calcSession, MAX_SESSION_MS };