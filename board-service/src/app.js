require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config/config');
const boardRoutes = require('./modules/boards/board.routes');
const taskRoutes = require('./modules/tasks/task.routes');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  })
);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/boards', boardRoutes);
// createColumn/getColumns/deleteColumn need :boardId, so this router only
// makes sense nested under /api/boards/:boardId/columns (see board.routes.js).
app.use('/api/tasks', taskRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Board service is running' });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  res.status(400).json({ message: err.message });
});

module.exports = app;
