/**
 * profile.service.js
 * Business logic for creating and managing tutor/institute profiles.
 */
const repo = require('./profile.repository');
const accountsRepository = require('../accounts/accounts.repository');
const { AppError, UserNotFoundError } = require('../../utils/errors');

const PROFILE_TYPES = ['private_tutor', 'coaching_center', 'small_institute'];
const APPROVER_ROLES = ['manager', 'ceo', 'admin', 'super-admin'];

function canReview(user) {
  return APPROVER_ROLES.includes(user.role);
}

async function createProfile(userId, data) {
  const user = await accountsRepository.getById(userId);
  if (!user) throw new UserNotFoundError();

  if (!PROFILE_TYPES.includes(data.type)) {
    throw new AppError(`type must be one of: ${PROFILE_TYPES.join(', ')}`, 422, 'VALIDATION_ERROR');
  }

  const existing = await repo.getByUserId(userId);
  if (existing) {
    throw new AppError('This user already has a profile', 409, 'PROFILE_ALREADY_EXISTS');
  }

  return repo.create(userId, data);
}

async function getMyProfile(userId) {
  const profile = await repo.getByUserId(userId);
  if (!profile) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  return profile;
}

async function getProfile(profileId) {
  const profile = await repo.getById(profileId);
  if (!profile) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  return profile;
}

async function listProfiles(filters) {
  return repo.getAll(filters);
}

/** Owner can edit their own profile's content fields (not status/rating). */
async function updateMyProfile(userId, fields) {
  const profile = await repo.getByUserId(userId);
  if (!profile) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  return repo.update(profile.id, fields);
}

/** Admin/manager/CEO reviews a submitted profile. */
async function reviewProfile(profileId, reviewerUser, status) {
  if (!canReview(reviewerUser)) {
    throw new AppError('Only an admin/manager/CEO can review profiles', 403, 'FORBIDDEN');
  }
  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('status must be "approved" or "rejected"', 422, 'VALIDATION_ERROR');
  }

  const profile = await repo.getById(profileId);
  if (!profile) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

  return repo.updateStatus(profileId, status);
}

async function deleteProfile(userId, profileId, requester) {
  const profile = await repo.getById(profileId);
  if (!profile) throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');

  const isOwner = profile.user_id === requester.id;
  if (!isOwner && !canReview(requester)) {
    throw new AppError('Not authorized to delete this profile', 403, 'FORBIDDEN');
  }

  await repo.remove(profileId);
}

module.exports = {
  PROFILE_TYPES,
  createProfile,
  getMyProfile,
  getProfile,
  listProfiles,
  updateMyProfile,
  reviewProfile,
  deleteProfile,
};
