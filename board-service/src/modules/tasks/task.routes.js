const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const {
  moveTask,
  updateTask,
  deleteTask,
  addTaskComment,
  toggleTimer,
  getTasks,
  uploadtaskFile,
  deleteTaskFile,
} = require('./task.controller');
const { protect } = require('../../middleware/auth');

const uploadPath = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.patch('/:taskId/move', protect, moveTask);
router.patch('/:taskId', protect, updateTask);
router.delete('/:taskId', protect, deleteTask);
router.post('/:taskId/comments', protect, upload.array('files'), addTaskComment);
router.post('/:taskId/timer', protect, toggleTimer);
router.post('/:taskId/upload', protect, upload.array('files'), uploadtaskFile);
router.get('/', protect, getTasks);
router.delete('/:taskId/upload/:fileId', protect, deleteTaskFile);

module.exports = router;
