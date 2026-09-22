const express = require('express');

const router = express.Router();

const activityController =
    require('./activity.controller');


// Create activity
router.post(
    '/',
    activityController.create
);


// Get all activities
router.get(
    '/',
    activityController.getAll
);


// Get activity by ID
router.get(
    '/:id',
    activityController.getById
);


// Get activities by user
router.get(
    '/user/:userId',
    activityController.getByUser
);


// Get activities for entity
// Example:
// /api/activities/entity/Task/665abc
router.get(
    '/entity/:entityType/:entityId',
    activityController.getByEntity
);

module.exports = router;