/**
 * approval.routes.js
 * All routes mounted under /approval in app.js.
 *
 * requireAuth     → valid JWT, populates req.user
 * requireApprover → role must be 'manager' or 'ceo'
 */
const express = require('express');
const controller = require('./approval.controller');
const { requireAuth } = require('../../middleware/auth');
const { requireApprover } = require('./approval.middleware');

const router = express.Router();

router.get('/pending', requireAuth, requireApprover, controller.getPendingRequests);
router.get('/', requireAuth, requireApprover, controller.getAllRequests);
router.get('/:requestId', requireAuth, requireApprover, controller.getRequest);
router.patch('/:requestId/approve', requireAuth, requireApprover, controller.approveRequest);
router.patch('/:requestId/reject', requireAuth, requireApprover, controller.rejectRequest);

module.exports = router;
