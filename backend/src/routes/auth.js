import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query } from '../db/index.js';

const router = Router();

const signToken = (user, role) =>
  jwt.sign({ id: user.id, email: user.email, role: role || 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const normalizedEmail = email.toLowerCase().trim();

    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = :email FETCH FIRST 1 ROWS ONLY',
      { email: normalizedEmail }
    );
    if (existing.length) return res.status(400).json({ error: 'Email already registered' });

    const id = randomUUID();
    const now = new Date();
    const password_hash = await bcrypt.hash(password, 12);

    await query(
      `INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
       VALUES (:id, :email, :password_hash, :full_name, :created_at, :updated_at)`,
      { id, email: normalizedEmail, password_hash, full_name: fullName || null, created_at: now, updated_at: now }
    );

    await query(
      'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (:id, :userId, :role, :created_at)',
      { id: randomUUID(), userId: id, role: 'user', created_at: now }
    );

    const user = { id, email: normalizedEmail, full_name: fullName || null, avatar_url: null, created_at: now, updated_at: now };
    const token = signToken(user, 'user');
    res.status(201).json({ user: { ...user, role: 'user' }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { rows: [user] } = await query(
      'SELECT * FROM users WHERE email = :email FETCH FIRST 1 ROWS ONLY',
      { email: email.toLowerCase().trim() }
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { rows: [roleRow] } = await query(
      'SELECT role FROM user_roles WHERE user_id = :userId FETCH FIRST 1 ROWS ONLY',
      { userId: user.id }
    );
    const role = roleRow?.role || 'user';

    const { password_hash: _ph, ...safeUser } = user;
    const token = signToken(safeUser, role);
    res.json({ user: { ...safeUser, role }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);

    const { rows: [user] } = await query(
      'SELECT * FROM users WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: payload.id }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { rows: [roleRow] } = await query(
      'SELECT role FROM user_roles WHERE user_id = :userId FETCH FIRST 1 ROWS ONLY',
      { userId: user.id }
    );
    const { password_hash: _ph, ...safeUser } = user;
    res.json({ ...safeUser, role: roleRow?.role || 'user' });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const password_hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password_hash = :hash, updated_at = :now WHERE id = :id',
      { hash: password_hash, now: new Date(), id }
    );
    res.json({ success: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
