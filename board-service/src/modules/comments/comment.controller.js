const { v4: uuidv4 } = require('uuid');
const { uploadAll, destroyFile, cleanFileName } = require('../../utils/cloudinary');
const taskRepo = require('../tasks/task.repository');
const commentRepo = require('./comment.repository');
const activityRepo = require('../activity/activity.repository');
const { getAccessibleTask } = require('../tasks/task.access');
const { presentTask } = require('../tasks/task.presenter');
const { getUserById } = require('../../utils/userClient');
const { canEdit, canDelete } = require('./comment.policy');
const { notifyComment } = require('./comment.notify');
const { buildCommentBlocks, validateEditedBlocks, plainText, mentionIdsFrom, parseBlocks } = require('./comment.blocks');

const snippetOf = (text) => text.replace(/\s+/g, ' ').slice(0, 300) || 'Shared an attachment';

const addTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const files = req.files || [];
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;
    const { task, board } = access;

    const draft = buildCommentBlocks(req.body || {}, files.length);
    if (draft.length === 0) return res.status(400).json({ message: 'Comment cannot be empty' });

    const results = await uploadAll(files, `taskup/tasks/${taskId}/comments`);
    const attachments = files.map((f, i) => ({
      id: uuidv4(), fileName: cleanFileName(f.originalname), fileUrl: results[i].secure_url, fileType: f.mimetype,
      sizeBytes: results[i].bytes ?? f.size, publicId: results[i].public_id, resourceType: results[i].resource_type, uploadedBy: userId,
    }));
    const blocks = draft.map((b) => (b.type === 'file' ? { type: 'file', attachment_id: attachments[b.index].id } : b));
    const text = plainText(draft);

    try {
      await commentRepo.create(taskId, { userId, text, blocks, attachments });
    } catch (dbErr) {
      await Promise.all(results.map((r) => destroyFile(r.public_id, r.resource_type)));
      throw dbErr;
    }
    await activityRepo.add(taskId, {
      userId,
      action: attachments.length ? `added a comment with ${attachments.length} file(s)`
        : `added a comment: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`,
    });

    const full = await taskRepo.findFull(taskId, userId);
    const memberIds = new Set(board.members.map(String));
    const mentionIds = mentionIdsFrom(draft).filter((id) => memberIds.has(id) && id !== String(userId));
    const generalIds = [...new Set([
      ...(full.assignedTo || []).map(String),
      ...(full.comments || []).map((c) => c.user_id).filter(Boolean).map(String),
    ])].filter((id) => id !== String(userId) && !mentionIds.includes(id));

    notifyComment({ task, board, authorId: userId, snippet: snippetOf(text), mentionIds, generalIds })
      .catch((e) => console.error('comment notifications failed:', e.message));

    res.status(201).json(await presentTask(full, req.user));
  } catch (error) {
    console.error('addTaskComment error:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Failed to post comment' });
  }
};

const editComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;
    const { task, board } = access;

    const comment = await commentRepo.findById(commentId);
    if (!comment || String(comment.task_id) !== String(taskId)) return res.status(404).json({ message: 'Comment not found' });
    if (!canEdit(req.user, comment)) return res.status(403).json({ message: 'You can only edit your own comments' });

    const { blocks, removedIds } = validateEditedBlocks(req.body?.blocks, comment.attachments);
    const text = plainText(blocks);

    // People already mentioned in the old version must not be emailed again.
    const before = parseBlocks(comment.blocks) ?? [{ type: 'text', text: comment.text }];
    const alreadyMentioned = new Set(mentionIdsFrom(before));

    await commentRepo.update(commentId, { text, blocks, removeAttachmentIds: removedIds });
    // Cloudinary cleanup only after the DB change succeeded
    Promise.all(comment.attachments.filter((a) => removedIds.includes(a.id))
      .map((a) => destroyFile(a.public_id, a.resource_type || 'image'))).catch(() => {});

    await activityRepo.add(taskId, { userId: req.user.id, action: 'edited a comment' });

    const memberIds = new Set(board.members.map(String));
    const newMentions = mentionIdsFrom(blocks).filter(
      (id) => memberIds.has(id) && id !== String(req.user.id) && !alreadyMentioned.has(id));
    if (newMentions.length) {
      notifyComment({ task, board, authorId: req.user.id, snippet: snippetOf(text), mentionIds: newMentions })
        .catch((e) => console.error('mention notifications failed:', e.message));
    }

    res.status(200).json(await presentTask(await taskRepo.findFull(taskId, req.user.id), req.user));
  } catch (error) {
    console.error('editComment error:', error);
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Failed to edit comment' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const access = await getAccessibleTask(req, res, taskId);
    if (!access) return;

    const comment = await commentRepo.findById(commentId);
    if (!comment || String(comment.task_id) !== String(taskId)) return res.status(404).json({ message: 'Comment not found' });
    if (!canDelete(req.user, comment)) return res.status(403).json({ message: "You can't delete this comment" });

    await commentRepo.remove(commentId);
    Promise.all(comment.attachments.map((a) => destroyFile(a.public_id, a.resource_type || 'image'))).catch(() => {});

    const own = String(comment.user_id) === String(req.user.id);
    const author = own ? null : await getUserById(comment.user_id);
    await activityRepo.add(taskId, {
      userId: req.user.id,
      action: own ? 'deleted a comment' : `deleted a comment by ${author?.full_name || 'another user'}`,
    });

    res.status(200).json(await presentTask(await taskRepo.findFull(taskId, req.user.id), req.user));
  } catch (error) {
    console.error('deleteComment error:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};
module.exports = { addTaskComment, editComment, deleteComment };