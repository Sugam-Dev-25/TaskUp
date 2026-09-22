const express = require('express');
const router = express.Router({ mergeParams: true });

const { createColumn, deleteColumn, getColumns } = require('./column.controller');
const { protect } = require('../../middleware/auth');
const { createTask } = require('../tasks/task.controller');

router.post('/create', protect, createColumn);
router.get('/', getColumns);
router.post('/:columnId/tasks', protect, createTask);
router.delete('/:columnId', protect, deleteColumn);

module.exports = router;
