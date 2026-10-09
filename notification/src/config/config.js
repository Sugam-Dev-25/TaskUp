require('dotenv').config();

module.exports = {
    app: {
        name: process.env.APP_NAME,
        env: process.env.NODE_ENV,
        debug: (process.env.DEBUG ) === 'true',
        port: parseInt(process.env.PORT, 10)
    },
    db: {
        host: process.env.DB_HOST ,
        port: parseInt(process.env.DB_PORT , 10),
        user: process.env.DB_USER ,
        password: process.env.DB_PASSWORD ,
        database: process.env.DB_NAME
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        user: process.env.SMTP_USER ,
        password: process.env.SMTP_PASSWORD,
        fromEmail: process.env.SMTP_FROM_EMAIL,
        secure: (process.env.SMTP_USE_TLS ) === 'true',

    },
    frontend: {
        resetPasswordUrl: process.env.FRONTEND_RESET_PASSWORD_URL,
        verifyEmailUrl: process.env.FRONTEND_VERIFY_EMAIL_URL ,
    },
    hostingerMailApi: {
  token: process.env.HOSTINGER_MAIL_API_TOKEN || '',
},

    cors: {
        allowedOrigins: (process.env.ALLOWED_ORIGINS).split(','),
    },
    jwt: {
  secret: process.env.JWT_SECRET_KEY ,
},
}