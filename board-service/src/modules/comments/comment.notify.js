const { getUserById, getUsersByIds } = require('../../utils/userClient');
const { notifyUser } = require('../../utils/notifyClient');
const templates = require('../../utils/emailTemplates');
const config = require('../../config/config');

async function notifyComment({ task, board, authorId, snippet, mentionIds = [], generalIds = [] }) {
  const [author, usersById] = await Promise.all([getUserById(authorId), getUsersByIds([...mentionIds, ...generalIds])]);
  const authorName = author?.full_name || 'Someone';
  const linkFor = (u) => `${config.frontend.url}/${u.role || 'employee'}/dashboard/tasks/${task.id}`;
  const send = (id, title, message, build) => {
    const u = usersById[id];
    if (!u) return null;
    return notifyUser({ userId: u.id, title, message, email: u.email ? { to: u.email, ...build(linkFor(u)) } : undefined });
  };
  await Promise.all([
    ...mentionIds.map((id) => send(id, 'You were mentioned', `${authorName} mentioned you on "${task.title}"`,
      (taskLink) => templates.mentioned({ taskTitle: task.title, boardName: board.name, mentionedBy: authorName, comment: snippet, taskLink }))),
    ...generalIds.map((id) => send(id, 'New comment', `${authorName} commented on "${task.title}"`,
      (taskLink) => templates.commentAdded({ taskTitle: task.title, boardName: board.name, commentedBy: authorName, comment: snippet, taskLink }))),
  ]);
}
module.exports = { notifyComment };