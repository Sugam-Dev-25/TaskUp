const axios = require('axios');
const config = require('../config/config');

/**
 * Replaces the old Board/Task Mongoose hooks that created Notification
 * rows in-process. Notifications now live in their own service (see
 * notification-service's schema.sql: `notifications` table keyed by
 * user_id/title/message), so board-service notifies people over HTTP.
 *
 * Fire-and-forget: a notification failing to send should never fail the
 * board/task operation that triggered it, so errors are only logged.
 */
async function notifyUser({ userId, title, message }) {
  if (!userId || !title || !message) return;
  try {
    await axios.post(
      `${config.services.notificationServiceUrl}/api/notifications`,
      { user_id: userId, title, message },
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

module.exports = { notifyUser, notifyBoardMembers };
