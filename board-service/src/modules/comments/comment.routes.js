const router = require('express').Router();
const { protect } = require('../../middleware/auth');
const { uploadFiles } = require('../../middleware/upload');
const { addTaskComment, editComment, deleteComment } = require('./comment.controller');

router.post('/:taskId/comments', protect, uploadFiles, addTaskComment);
router.patch('/:taskId/comments/:commentId', protect, editComment);
router.delete('/:taskId/comments/:commentId', protect, deleteComment);
module.exports = router;