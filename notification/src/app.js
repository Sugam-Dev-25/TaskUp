require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config/config');

const activityRoutes = require('./modules/activities/activity.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');

const app = express();

app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true, // required since notificationApiClient sends withCredentials: true
  })
);
app.use(express.json());

app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Notification service is running' });
});

module.exports = app;