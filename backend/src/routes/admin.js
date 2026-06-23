import { Router } from 'express';
import { query } from '../db/index.js';
import { oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// GET /api/admin/users  — all admin users with profile info
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ur.id, ur.user_id, ur.role, ur.created_at, u.email, u.full_name
       FROM user_roles ur
       JOIN users u ON ur.user_id = u.id
       WHERE ur.role = 'admin'
       ORDER BY ur.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/admin/users  { email }  — grant admin to a registered user
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { rows: [user] } = await query(
      'SELECT id FROM users WHERE email = :email FETCH FIRST 1 ROWS ONLY',
      { email: email.toLowerCase().trim() }
    );
    if (!user) return res.status(404).json({ error: 'User not found. Make sure the email is registered on this portal.' });

    const { rows: [existing] } = await query(
      `SELECT id FROM user_roles WHERE user_id = :userId AND role = 'admin' FETCH FIRST 1 ROWS ONLY`,
      { userId: user.id }
    );
    if (existing) return res.status(400).json({ error: 'This user is already an admin.' });

    await query(
      `UPDATE user_roles SET role = 'admin' WHERE user_id = :userId`,
      { userId: user.id }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:roleId  — revoke admin (downgrade to user)
router.patch('/users/:roleId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query(
      `UPDATE user_roles SET role = 'user' WHERE id = :id`,
      { id: req.params.roleId }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
