const { v4: uuidv4 } = require('uuid');
const { uploadAll, destroyFile, cleanFileName } = require('../../utils/cloudinary');
const taskRepo = require('../tasks/task.repository');
const attachmentRepo = require('./attachment.repository');
const activityRepo = require('../activity/activity.repository');
const { getAccessibleTask } = require('../tasks/task.access');
const { presentTask } = require('../tasks/task.presenter');

const respond = async (res, taskId, req) =>
  res.status(200).json(await presentTask(await taskRepo.findFull(taskId, req.user.id), req.user));

const uploadtaskFile = async (req, res) => {
  try {
    const { taskId } = req.params;
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;
    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ message: 'No files received' });

    const results = await uploadAll(files, `taskup/tasks/${taskId}`);
    const rows = files.map((f, i) => ({
      id: uuidv4(), fileName: cleanFileName(f.originalname), fileUrl: results[i].secure_url, fileType: f.mimetype,
      sizeBytes: results[i].bytes ?? f.size, publicId: results[i].public_id, resourceType: results[i].resource_type,
      uploadedBy: req.user.id,
    }));
    try {
      await attachmentRepo.add(taskId, rows);
    } catch (dbErr) {
      await Promise.all(results.map((r) => destroyFile(r.public_id, r.resource_type)));
      throw dbErr;
    }
    await activityRepo.add(taskId, { userId: req.user.id, action: `uploaded ${rows.length} file(s)` });
    await respond(res, taskId, req);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'File upload failed' });
  }
};

const deleteTaskFile = async (req, res) => {
  try {
    const { taskId, fileId } = req.params;
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;

    const attachment = await attachmentRepo.findById(fileId);
    if (!attachment || String(attachment.task_id) !== String(taskId)) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    const canDelete = String(attachment.uploaded_by) === String(req.user.id) || ['manager', 'ceo'].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ message: 'Only the uploader, a manager or the CEO can delete this file' });

    await attachmentRepo.remove(fileId);
    await destroyFile(attachment.public_id, attachment.resource_type || 'image');
    await activityRepo.add(taskId, { userId: req.user.id, action: `deleted attachment: ${attachment.file_name}` });
    await respond(res, taskId, req);
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Delete failed' });
  }
};
module.exports = { uploadtaskFile, deleteTaskFile };