const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const accountsRepository = require('./accounts.repository');
const authService = require('../auth/auth.service');
const emailVerificationService = require('../emailVerification/emailVerification.service');
const { validateRegisterInput } = require('../auth/auth.validators');
const accountsService= require('./accounts.service')
const ASSIGNABLE_ROLES = ['employee', 'hr', 'manager']; 

const router = express.Router();

router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.status(200).json([]);

    const users = await accountsRepository.searchByNameOrEmail(query.trim());

   
    const results = users.map(({ id, email, full_name, role }) => ({
      id,
      email,
      full_name,
      role,
    }));

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});
// user-service accounts.routes.js — add (manager/ceo only)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!['manager', 'ceo'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const users = await accountsRepository.listAll(); // needs a simple SELECT id, full_name, email, role, created_at FROM users
    res.json(users);
  } catch (err) { next(err); }
});
router.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!['manager', 'ceo'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only a manager or CEO can create accounts' });
    }

    const { email, password, full_name, role } = req.body;
    validateRegisterInput({ email, password });

    // A manager can create employee/hr; only the CEO can create another manager.
    const allowed = req.user.role === 'ceo' ? ASSIGNABLE_ROLES : ['employee', 'hr'];
    if (!allowed.includes(role)) {
      return res.status(403).json({ message: `You can't create a "${role}" account` });
    }

    const user = await authService.register({ email, password, full_name, role });
    await emailVerificationService.sendVerification(user.email);
    await accountsRepository.markApproved(user.id, req.user.id);   // see step 2

    res.status(201).json({
      ...accountsService.toPublic(user),
      message: 'Account created. A verification link has been sent to the new user.',
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;