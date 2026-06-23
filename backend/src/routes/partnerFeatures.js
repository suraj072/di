import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, transaction, exec } from '../db/index.js';
import { processFeature, toOracleBool, oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// GET /api/partner-features?initiativePartnerId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { initiativePartnerId } = req.query;
    const sql = initiativePartnerId
      ? 'SELECT * FROM partner_features WHERE initiative_partner_id = :id ORDER BY feature_name ASC'
      : 'SELECT * FROM partner_features ORDER BY feature_name ASC';
    const params = initiativePartnerId ? { id: initiativePartnerId } : {};

    const { rows } = await query(sql, params);
    res.json(rows.map(processFeature));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/partner-features/upsert  { initiativePartnerId, features: [...] }
router.post('/upsert', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { initiativePartnerId, features } = req.body;
    if (!initiativePartnerId) return res.status(400).json({ error: 'initiativePartnerId required' });

    const now = new Date();
    const inserted = [];

    await transaction(async (conn) => {
      await exec(conn,
        'DELETE FROM partner_features WHERE initiative_partner_id = :id',
        { id: initiativePartnerId }
      );

      for (const f of (features || [])) {
        const id = randomUUID();
        const row = {
          id,
          initiative_partner_id: initiativePartnerId,
          feature_name: f.feature_name,
          is_available: toOracleBool(f.is_available !== false),
          notes: f.notes || null,
          created_at: now,
          updated_at: now,
        };
        await exec(conn,
          `INSERT INTO partner_features (id, initiative_partner_id, feature_name, is_available, notes, created_at, updated_at)
           VALUES (:id, :initiative_partner_id, :feature_name, :is_available, :notes, :created_at, :updated_at)`,
          row
        );
        inserted.push(processFeature(row));
      }
    });

    res.json(inserted);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
