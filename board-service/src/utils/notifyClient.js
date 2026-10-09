const axios = require('axios');
const config = require('../config/config');
const { getUserById } = require('./userClient');
const templates = require('./emailTemplates');

/**
 * Notifications (and optional emails) live in the notification-service.
 * Fire-and-forget: a failed notification must never fail the board/task
 * operation that triggered it, so errors are only logged.
 *
 * `email` is optional: { to, subject, html }. The notification-service
 * sends it after saving the notification row.
 */
async function notifyUser({ userId, title, message, email }) {
  if (!userId || !title || !message) return;
  try {
    await axios.post(
      `${config.services.notificationServiceUrl}/api/notifications`,
      { user_id: userId, title, message, email },
      { timeout: 3000 }
    );
  } catch (error) {
    console.error(`notifyClient: failed to notify user ${userId}:`, error.message);
  }
}

/** Notify every member of a board except the person who triggered the action. */
async function notifyBoardMembers({ memberIds = [], actorId, title, message }) {
  const recipients = memberIds.map(String).filter((id) => id !== String(actorId));
  await Promise.all(recipients.map((userId) => notifyUser({ userId, title, message })));
}

/** Task assigned: in-app notification + email. */
async function notifyAssigned({ assigneeId, actorId, taskTitle, boardName }) {
  const [assignee, actor] = await Promise.all([getUserById(assigneeId), getUserById(actorId)]);
  return notifyUser({
    userId: assigneeId,
    title: 'New task assigned',
    message: `You were assigned to "${taskTitle}"`,
    email: assignee?.email
      ? {
          to: assignee.email,
          ...templates.taskAssigned({
            taskTitle,
            boardName: boardName || 'a project',
            assignedBy: actor?.full_name || 'Someone',
          }),
        }
      : undefined,
  });
}

/** Added to a board: in-app notification + email. */
async function notifyAddedToBoard({ memberId, actorId, boardName }) {
  const [member, actor] = await Promise.all([getUserById(memberId), getUserById(actorId)]);
  return notifyUser({
    userId: memberId,
    title: 'Added to board',
    message: `You were added to the board "${boardName}"`,
    email: member?.email
      ? {
          to: member.email,
          ...templates.addedToBoard({
            boardName,
            addedBy: actor?.full_name || 'A manager',
          }),
        }
      : undefined,
  });
}

module.exports = { notifyUser, notifyBoardMembers, notifyAssigned, notifyAddedToBoard };