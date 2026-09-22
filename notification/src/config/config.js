require('dotenv').config();

module.exports = {
    app: {
        name: process.env.APP_NAME || 'notification',
        env: process.env.NODE_ENV || 'development',
        debug: (process.env.DEBUG || 'true') === 'true',
        port: parseInt(process.env.PORT || '8001', 10)
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'auth_db'
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@example.com',
        secure: (process.env.SMTP_USE_TLS || 'true') === 'true',

    },
    frontend: {
        resetPasswordUrl: process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:5173/reset-password',
        verifyEmailUrl: process.env.FRONTEND_VERIFY_EMAIL_URL || 'http://localhost:5173/verify-email',
    },

    cors: {
        allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
    },
    jwt: {
  secret: process.env.JWT_SECRET_KEY || 'CHANGE_ME_IN_PRODUCTION',
},
}