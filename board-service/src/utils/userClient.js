const axios = require('axios');
const config = require('../config/config');

/**
 * Replaces the old `.populate('owner', 'name email')` calls, which relied
 * on Board/Task living in the same DB as the User model. That's no longer
 * true, so board-service fetches display info from the user-service.
 *
 * NOTE: this expects a `GET /internal/users/:id` route on the user-service
 * returning { id, name, email, role }. It does NOT currently exist there —
 * see this service's README for the exact route to add. Until it exists,
 * calls below fail closed to a minimal placeholder so board APIs keep
 * working instead of throwing.
 */
async function getUserById(id) {
  if (!id) return null;
  try {
    const { data } = await axios.get(`${config.services.userServiceUrl}/internal/users/${id}`, {
      timeout: 3000,
    });
    return { id, full_name: data.full_name, email: data.email, role: data.role };
  } catch (error) {
    console.error(`userClient: failed to fetch user ${id}:`, error.message);
    return { id, full_name: null, email: null, role: null };
  }
}

async function getUsersByIds(ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
  const results = await Promise.all(uniqueIds.map(getUserById));
  const byId = {};
  results.forEach((u) => {
    if (u) byId[u.id] = u;   // ← keyed by `id`, not `_id`
  });
  return byId;
}

module.exports = { getUserById, getUsersByIds };


