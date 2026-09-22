/**
 * profile.routes.js
 * Mounted at /profile in app.js.
 */
const express = require('express');
const controller = require('./profile.controller');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// Specific paths before the /:profileId catch-all so they don't get swallowed.
router.get('/me', requireAuth, controller.getMyProfile);
router.patch('/me', requireAuth, controller.updateMyProfile);

router.post('/', requireAuth, controller.createProfile);
router.get('/', controller.listProfiles); // public browse — no auth required
router.get('/:profileId', controller.getProfile); // public — no auth required

router.patch('/:profileId/review', requireAuth, controller.reviewProfile);
router.delete('/:profileId', requireAuth, controller.deleteProfile);

module.exports = router;
