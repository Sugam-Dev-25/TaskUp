const express = require('express');
const router = express.Router();
const { moveTask, updateTask, deleteTask, getTasks} = require('./task.controller');
const { protect } = require('../../middleware/auth');

router.patch('/:taskId/move', protect, moveTask);
router.patch('/:taskId', protect, updateTask);
router.delete('/:taskId', protect, deleteTask);
router.get('/', protect, getTasks);

module.exports = router;
