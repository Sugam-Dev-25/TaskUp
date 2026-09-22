/**
 * profile.repository.js
 * Raw DB queries for the profiles table. No business logic here.
 */
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../config/database');

/** Create a profile for a user. One profile per user (unique on user_id). */
async function create(userId, { type, location = null, experience = null, description = null,
  contactPhone = null, contactEmail = null, profileImage = null }) {
  const id = uuidv4();
  await query(
    `INSERT INTO profiles
       (id, user_id, type, location, experience, description, contact_phone, contact_email, profile_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, type, location, experience, description, contactPhone, contactEmail, profileImage]
  );
  return getById(id);
}

async function getById(profileId) {
  const rows = await query('SELECT * FROM profiles WHERE id = ?', [profileId]);
  return rows[0] || null;
}

async function getByUserId(userId) {
  const rows = await query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function getAll({ status = null, type = null, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT p.*, u.email AS user_email, u.full_name AS user_full_name
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE 1 = 1
  `;
  const params = [];
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  if (type) {
    sql += ' AND p.type = ?';
    params.push(type);
  }
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return query(sql, params);
}

/** Partial update — only updates fields that are actually passed in. */
async function update(profileId, fields) {
  const allowed = ['type', 'location', 'experience', 'description', 'contact_phone', 'contact_email', 'profile_image'];
  const columnMap = {
    type: 'type',
    location: 'location',
    experience: 'experience',
    description: 'description',
    contactPhone: 'contact_phone',
    contactEmail: 'contact_email',
    profileImage: 'profile_image',
  };

  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = columnMap[key];
    if (column && allowed.includes(column)) {
      sets.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (!sets.length) return getById(profileId);

  params.push(profileId);
  await query(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`, params);
  return getById(profileId);
}

async function updateStatus(profileId, status) {
  await query('UPDATE profiles SET status = ? WHERE id = ?', [status, profileId]);
  return getById(profileId);
}

async function updateRating(profileId, rating) {
  await query('UPDATE profiles SET rating = ? WHERE id = ?', [rating, profileId]);
  return getById(profileId);
}

async function remove(profileId) {
  await query('DELETE FROM profiles WHERE id = ?', [profileId]);
}

module.exports = {
  create,
  getById,
  getByUserId,
  getAll,
  update,
  updateStatus,
  updateRating,
  remove,
};
