/**
 * profile.controller.js
 * HTTP layer — parse request, call service, send response.
 */
const service = require('./profile.service');

/** POST /profile — create the calling user's profile */
async function createProfile(req, res, next) {
  try {
    const { type, location, experience, description, contactPhone, contactEmail, profileImage } = req.body;
    const profile = await service.createProfile(req.user.id, {
      type, location, experience, description, contactPhone, contactEmail, profileImage,
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
}

/** GET /profile/me — the calling user's own profile */
async function getMyProfile(req, res, next) {
  try {
    const profile = await service.getMyProfile(req.user.id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

/** GET /profile/:profileId — public profile lookup */
async function getProfile(req, res, next) {
  try {
    const profile = await service.getProfile(req.params.profileId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

/** GET /profile?status=&type=&limit=&offset= — browse/list profiles */
async function listProfiles(req, res, next) {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    const profiles = await service.listProfiles({
      status: status || null,
      type: type || null,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    res.status(200).json({ data: profiles, count: profiles.length });
  } catch (err) {
    next(err);
  }
}

/** PATCH /profile/me — update the calling user's own profile */
async function updateMyProfile(req, res, next) {
  try {
    const { type, status, rating, ...editableFields } = req.body; // strip fields users can't self-edit
    const profile = await service.updateMyProfile(req.user.id, editableFields);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

/** PATCH /profile/:profileId/review — admin/manager/CEO approves or rejects */
async function reviewProfile(req, res, next) {
  try {
    const { status } = req.body;
    const profile = await service.reviewProfile(req.params.profileId, req.user, status);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

/** DELETE /profile/:profileId */
async function deleteProfile(req, res, next) {
  try {
    await service.deleteProfile(req.user.id, req.params.profileId, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProfile,
  getMyProfile,
  getProfile,
  listProfiles,
  updateMyProfile,
  reviewProfile,
  deleteProfile,
};
