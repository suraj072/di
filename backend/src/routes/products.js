import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { processProduct, buildUpdate, oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// GET /api/products  ?showInactive=true
router.get('/', requireAuth, async (req, res) => {
  try {
    const { showInactive } = req.query;
    const sql = showInactive === 'true'
      ? 'SELECT * FROM products ORDER BY display_order ASC'
      : 'SELECT * FROM products WHERE is_active = 1 ORDER BY display_order ASC';

    const { rows } = await query(sql);
    res.json(rows.map(processProduct));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [row] } = await query(
      'SELECT * FROM products WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(processProduct(row));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, category, is_active, display_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = randomUUID();
    const now = new Date();
    const isActive = is_active !== false ? 1 : 0;
    const order = display_order ?? 0;

    await query(
      `INSERT INTO products (id, name, description, category, is_active, display_order, created_at, updated_at)
       VALUES (:id, :name, :description, :category, :is_active, :display_order, :created_at, :updated_at)`,
      { id, name, description: description || null, category: category || null, is_active: isActive, display_order: order, created_at: now, updated_at: now }
    );

    res.status(201).json(processProduct({ id, name, description: description || null, category: category || null, is_active: isActive, display_order: order, created_at: now, updated_at: now }));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// PATCH /api/products/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = buildUpdate(req.body, ['name', 'description', 'category', 'display_order'], [], ['is_active']);
    if (!upd) return res.status(400).json({ error: 'No updatable fields provided' });

    upd.params.id = req.params.id;
    await query(`UPDATE products SET ${upd.sets.join(', ')} WHERE id = :id`, upd.params);

    const { rows: [updated] } = await query(
      'SELECT * FROM products WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(processProduct(updated));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id = :id', { id: req.params.id });
    res.status(204).send();
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
