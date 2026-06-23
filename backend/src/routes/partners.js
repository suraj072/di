import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { buildUpdate, oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

const PARTNER_FIELDS = ['name', 'logo_url', 'website', 'partner_type', 'status',
  'contact_name', 'contact_email', 'contact_phone', 'support_email', 'support_phone', 'support_hours'];

// GET /api/partners  ?status= &search=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const conditions = [];
    const params = {};

    if (status && status !== 'all') {
      conditions.push('status = :status');
      params.status = status;
    }
    if (search) {
      conditions.push('UPPER(name) LIKE :search');
      params.search = `%${search.toUpperCase()}%`;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM partners ${where} ORDER BY name ASC`, params);
    res.json(rows);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// GET /api/partners/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [row] } = await query(
      'SELECT * FROM partners WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!row) return res.status(404).json({ error: 'Partner not found' });
    res.json(row);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/partners
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, logo_url, website, partner_type, status,
      contact_name, contact_email, contact_phone, support_email, support_phone, support_hours } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = randomUUID();
    const now = new Date();
    const row = {
      id, name,
      logo_url: logo_url || null, website: website || null, partner_type: partner_type || null,
      status: status || 'active',
      contact_name: contact_name || null, contact_email: contact_email || null, contact_phone: contact_phone || null,
      support_email: support_email || null, support_phone: support_phone || null, support_hours: support_hours || null,
      created_at: now, updated_at: now,
    };

    await query(
      `INSERT INTO partners (id, name, logo_url, website, partner_type, status,
         contact_name, contact_email, contact_phone, support_email, support_phone, support_hours,
         created_at, updated_at)
       VALUES (:id, :name, :logo_url, :website, :partner_type, :status,
         :contact_name, :contact_email, :contact_phone, :support_email, :support_phone, :support_hours,
         :created_at, :updated_at)`,
      row
    );

    res.status(201).json(row);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// PATCH /api/partners/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = buildUpdate(req.body, PARTNER_FIELDS);
    if (!upd) return res.status(400).json({ error: 'No updatable fields provided' });

    upd.params.id = req.params.id;
    await query(`UPDATE partners SET ${upd.sets.join(', ')} WHERE id = :id`, upd.params);

    const { rows: [updated] } = await query(
      'SELECT * FROM partners WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!updated) return res.status(404).json({ error: 'Partner not found' });
    res.json(updated);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// DELETE /api/partners/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM partners WHERE id = :id', { id: req.params.id });
    res.status(204).send();
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
