const express=require('express');
const { protect } = require('../../middleware/auth');
const { uploadFiles } = require('../../middleware/upload');
const { uploadtaskFile, deleteTaskFile } = require('./attachment.controller');
const router=express.Router();

router.post('/:taskId/upload', protect, uploadFiles, uploadtaskFile);
router.delete('/:taskId/upload/:fileId', protect, deleteTaskFile);

module.exports=router;