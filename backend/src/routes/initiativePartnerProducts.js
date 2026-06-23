import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query, transaction, exec } from '../db/index.js';
import { processProduct, oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

// POST /api/initiative-partner-products/sync  { initiativePartnerId, productIds: [] }
router.post('/sync', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { initiativePartnerId, productIds } = req.body;
    if (!initiativePartnerId) return res.status(400).json({ error: 'initiativePartnerId required' });

    const now = new Date();
    const inserted = [];

    await transaction(async (conn) => {
      await exec(conn,
        'DELETE FROM initiative_partner_products WHERE initiative_partner_id = :id',
        { id: initiativePartnerId }
      );

      for (const productId of (productIds || [])) {
        const id = randomUUID();
        await exec(conn,
          `INSERT INTO initiative_partner_products (id, initiative_partner_id, product_id, usage_status, created_at, updated_at)
           VALUES (:id, :initiativePartnerId, :productId, :usage_status, :created_at, :updated_at)`,
          { id, initiativePartnerId, productId, usage_status: 'in_use', created_at: now, updated_at: now }
        );
        inserted.push({ id, initiative_partner_id: initiativePartnerId, product_id: productId, usage_status: 'in_use', created_at: now, updated_at: now });
      }
    });

    // Fetch with product details
    if (!inserted.length) return res.json([]);

    const enriched = await Promise.all(inserted.map(async (ipp) => {
      const { rows: [product] } = await query(
        'SELECT * FROM products WHERE id = :id FETCH FIRST 1 ROWS ONLY',
        { id: ipp.product_id }
      );
      return { ...ipp, product: product ? processProduct(product) : null };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
