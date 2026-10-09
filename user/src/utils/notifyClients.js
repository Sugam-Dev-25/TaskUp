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