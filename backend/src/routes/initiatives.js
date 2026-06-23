import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { buildUpdate, processProduct, processFeature, processIP, processSupport, processSpec, oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

const INIT_FIELDS = ['name', 'description', 'overview', 'category', 'status', 'logo_url', 'parent_id'];
const INIT_CLOB   = ['description', 'overview'];

// GET /api/initiatives  ?status= &search= &parentId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search, parentId } = req.query;
    const conditions = [];
    const params = {};

    if (status && status !== 'all') { conditions.push('i.status = :status'); params.status = status; }
    if (search)  { conditions.push('UPPER(i.name) LIKE :search'); params.search = `%${search.toUpperCase()}%`; }
    if (parentId === 'null') conditions.push('i.parent_id IS NULL');
    else if (parentId) { conditions.push('i.parent_id = :parentId'); params.parentId = parentId; }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows: initiatives } = await query(
      `SELECT * FROM initiatives i ${where} ORDER BY i.created_at DESC`,
      params
    );

    if (!initiatives.length) return res.json([]);

    // Fetch initiative_partners + basic partner info for all returned initiatives
    const inClause = initiatives.map((_, i) => `:iid${i}`).join(',');
    const inParams = {};
    initiatives.forEach((init, i) => { inParams[`iid${i}`] = init.id; });

    const { rows: ipRows } = await query(
      `SELECT ip.id, ip.initiative_id, p.id AS partner_id, p.name AS partner_name, p.logo_url AS partner_logo_url
       FROM initiative_partners ip
       JOIN partners p ON ip.partner_id = p.id
       WHERE ip.initiative_id IN (${inClause})`,
      inParams
    );

    const ipMap = {};
    for (const row of ipRows) {
      if (!ipMap[row.initiative_id]) ipMap[row.initiative_id] = [];
      ipMap[row.initiative_id].push({
        id: row.id,
        partner: { id: row.partner_id, name: row.partner_name, logo_url: row.partner_logo_url },
      });
    }

    res.json(initiatives.map(init => ({ ...init, initiative_partners: ipMap[init.id] || [] })));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// GET /api/initiatives/parents
router.get('/parents', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name FROM initiatives WHERE parent_id IS NULL ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// GET /api/initiatives/:id  (full nested)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [initiative] } = await query(
      'SELECT * FROM initiatives WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });

    const { rows: ips } = await query(
      'SELECT * FROM initiative_partners WHERE initiative_id = :id ORDER BY created_at ASC',
      { id: req.params.id }
    );

    const ipData = await Promise.all(ips.map(async (ip) => {
      const [
        { rows: [partner] },
        { rows: features },
        { rows: docs },
        { rows: specs },
        { rows: ippRows },
        { rows: [support] },
      ] = await Promise.all([
        query('SELECT * FROM partners WHERE id = :id FETCH FIRST 1 ROWS ONLY', { id: ip.partner_id }),
        query('SELECT * FROM partner_features WHERE initiative_partner_id = :id ORDER BY feature_name ASC', { id: ip.id }),
        query('SELECT * FROM api_documents WHERE initiative_partner_id = :id ORDER BY created_at DESC', { id: ip.id }),
        query('SELECT * FROM api_specifications WHERE initiative_partner_id = :id', { id: ip.id }),
        query(
          `SELECT ipp.id AS ipp_id, ipp.initiative_partner_id, ipp.usage_status, ipp.implementation_date,
                  ipp.notes AS ipp_notes, ipp.created_at AS ipp_created_at, ipp.updated_at AS ipp_updated_at,
                  p.id AS prod_id, p.name AS prod_name, p.description AS prod_description,
                  p.category AS prod_category, p.is_active AS prod_is_active,
                  p.display_order AS prod_display_order, p.created_at AS prod_created_at, p.updated_at AS prod_updated_at
           FROM initiative_partner_products ipp
           JOIN products p ON ipp.product_id = p.id
           WHERE ipp.initiative_partner_id = :id`,
          { id: ip.id }
        ),
        query('SELECT * FROM support_details WHERE initiative_partner_id = :id FETCH FIRST 1 ROWS ONLY', { id: ip.id }),
      ]);

      return {
        ...processIP(ip),
        partner: partner || null,
        partner_features: features.map(processFeature),
        api_documents: docs,
        api_specifications: specs.map(processSpec),
        initiative_partner_products: ippRows.map(row => ({
          id: row.ipp_id,
          initiative_partner_id: row.initiative_partner_id,
          usage_status: row.usage_status,
          implementation_date: row.implementation_date,
          notes: row.ipp_notes,
          created_at: row.ipp_created_at,
          updated_at: row.ipp_updated_at,
          product: processProduct({
            id: row.prod_id, name: row.prod_name, description: row.prod_description,
            category: row.prod_category, is_active: row.prod_is_active,
            display_order: row.prod_display_order, created_at: row.prod_created_at, updated_at: row.prod_updated_at,
          }),
        })),
        support_details: processSupport(support) || null,
      };
    }));

    res.json({ ...initiative, initiative_partners: ipData });
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/initiatives
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, overview, category, status, logo_url, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const id = randomUUID();
    const now = new Date();
    const row = {
      id, name,
      description: description || null, overview: overview || null,
      category: category || null, status: status || 'active',
      logo_url: logo_url || null, parent_id: parent_id || null,
      created_at: now, updated_at: now,
    };

    await query(
      `INSERT INTO initiatives (id, name, description, overview, category, status, logo_url, parent_id, created_at, updated_at)
       VALUES (:id, :name, :description, :overview, :category, :status, :logo_url, :parent_id, :created_at, :updated_at)`,
      row
    );

    res.status(201).json(row);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// PATCH /api/initiatives/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = buildUpdate(req.body, INIT_FIELDS, INIT_CLOB);
    if (!upd) return res.status(400).json({ error: 'No updatable fields provided' });

    upd.params.id = req.params.id;
    await query(`UPDATE initiatives SET ${upd.sets.join(', ')} WHERE id = :id`, upd.params);

    const { rows: [updated] } = await query(
      'SELECT * FROM initiatives WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!updated) return res.status(404).json({ error: 'Initiative not found' });
    res.json(updated);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// DELETE /api/initiatives/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM initiatives WHERE id = :id', { id: req.params.id });
    res.status(204).send();
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
