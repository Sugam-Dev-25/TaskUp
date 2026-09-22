const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const accountsRepository = require('./accounts.repository');

const router = express.Router();

router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.status(200).json([]);

    const users = await accountsRepository.searchByNameOrEmail(query.trim());

    // UserSearchInput.tsx expects `_id`, not `id` — map it here rather
    // than changing the frontend's field name.
    const results = users.map(({ id, email, full_name, role }) => ({
      _id: id,
      email,
      full_name,
      role,
    }));

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

router.get('/internal/users/:id', async (req, res) => {
  const user = await accountsRepository.getById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ id: user.id, full_name: user.full_name, email: user.email, role: user.role });
});

module.exports = router;