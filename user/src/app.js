/**
 * app.js
 * NOTE: this file was referenced by server.js (require('./src/app')) but
 * wasn't among the files you'd shared with me — I've reconstructed it here
 * wiring together every middleware/router you did share, so the bundle
 * actually boots. Adjust mount paths/order if your real app.js differs.
 */
const express = require('express');
const cookieParser = require('cookie-parser');

const corsMiddleware = require('./middleware/cors');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const rateLimiter = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const approvalRoutes = require('./modules/approval/approval.routes');
const emailVerificationRoutes = require('./modules/emailVerification/emailVerification.routes');
const passwordResetRoutes = require('./modules/passwordReset/passwordReset.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const accountsRoutes=require('./modules/accounts/accounts.routes')
const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(requestId);
app.use(requestLogger);
app.use(rateLimiter);

app.use('/auth', authRoutes);
app.use('/approval', approvalRoutes);
app.use('/auth/email-verification', emailVerificationRoutes);
app.use('/auth/password-reset', passwordResetRoutes);
app.use('/profile', profileRoutes);
app.use('/api/users', accountsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
