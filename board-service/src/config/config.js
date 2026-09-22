require('dotenv').config();

module.exports = {
  app: {
    name: process.env.APP_NAME || 'board-service',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8002', 10),
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'board_db',
  },

  // Same signing secret the user-service uses to issue access tokens
  // (jwt.sign({ sub, type: 'access', role }, JWT_SECRET_KEY, ...)).
  // Board service only *verifies* tokens here — it never issues its own.
  jwt: {
    secret: process.env.JWT_SECRET_KEY || 'CHANGE_ME_IN_PRODUCTION',
  },

  // Other services this one talks to over HTTP instead of sharing a DB.
  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:8000',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8001',
  },

  uploads: {
    baseUrl: process.env.UPLOADS_BASE_URL || 'http://localhost:8002/uploads',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  },
};
