import { Router } from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { buildUpdate, processProduct, processFeature, processIP, processSupport, processSpec, toJsonStr, oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

const IP_FIELDS = [
  'initiative_id', 'partner_id',
  'integration_cost', 'annual_cost', 'pricing_per_call', 'pricing_unit', 'currency',
  'billing_contact', 'sla_percentage', 'terms_and_conditions', 'api_version',
  'api_documentation', 'api_notes', 'uat_api_key', 'production_api_key',
  'api_request_sample', 'api_response_sample',
  'media_type', 'media_title', 'media_url', 'media_description',
  'custom_commercial_fields', 'partner_rank',
];
const IP_CLOB_JSON = ['custom_commercial_fields'];
const IP_CLOB     = ['terms_and_conditions', 'api_documentation', 'api_notes', 'api_request_sample', 'api_response_sample'];

// GET /api/initiative-partners?initiativeId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { initiativeId } = req.query;
    if (!initiativeId) return res.status(400).json({ error: 'initiativeId query param required' });

    const { rows: ips } = await query(
      'SELECT * FROM initiative_partners WHERE initiative_id = :id ORDER BY created_at DESC',
      { id: initiativeId }
    );

    const ipData = await Promise.all(ips.map(async (ip) => {
      const [
        { rows: [partner] },
        { rows: features },
        { rows: ippRows },
      ] = await Promise.all([
        query('SELECT * FROM partners WHERE id = :id FETCH FIRST 1 ROWS ONLY', { id: ip.partner_id }),
        query('SELECT * FROM partner_features WHERE initiative_partner_id = :id ORDER BY feature_name ASC', { id: ip.id }),
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
      ]);

      return {
        ...processIP(ip),
        partner: partner || null,
        partner_features: features.map(processFeature),
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
      };
    }));

    res.json(ipData);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// GET /api/initiative-partners/:id  (full detail)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: [ip] } = await query(
      'SELECT * FROM initiative_partners WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!ip) return res.status(404).json({ error: 'Not found' });

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

    res.json({
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
    });
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/initiative-partners
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      initiative_id, partner_id,
      integration_cost, annual_cost, pricing_per_call, pricing_unit, currency, billing_contact,
      sla_percentage, terms_and_conditions, api_version, api_documentation, api_notes,
      uat_api_key, production_api_key, api_request_sample, api_response_sample,
      media_type, media_title, media_url, media_description,
      custom_commercial_fields, partner_rank,
    } = req.body;

    if (!initiative_id || !partner_id) return res.status(400).json({ error: 'initiative_id and partner_id required' });

    const id = randomUUID();
    const now = new Date();
    const ccf = toJsonStr(custom_commercial_fields) ?? '[]';

    await query(
      `INSERT INTO initiative_partners (
         id, initiative_id, partner_id,
         integration_cost, annual_cost, pricing_per_call, pricing_unit, currency, billing_contact,
         sla_percentage, terms_and_conditions, api_version, api_documentation, api_notes,
         uat_api_key, production_api_key, api_request_sample, api_response_sample,
         media_type, media_title, media_url, media_description,
         custom_commercial_fields, partner_rank, created_at, updated_at
       ) VALUES (
         :id, :initiative_id, :partner_id,
         :integration_cost, :annual_cost, :pricing_per_call, :pricing_unit, :currency, :billing_contact,
         :sla_percentage, :terms_and_conditions, :api_version, :api_documentation, :api_notes,
         :uat_api_key, :production_api_key, :api_request_sample, :api_response_sample,
         :media_type, :media_title, :media_url, :media_description,
         :custom_commercial_fields, :partner_rank, :created_at, :updated_at
       )`,
      {
        id, initiative_id, partner_id,
        integration_cost: integration_cost ?? null, annual_cost: annual_cost ?? null,
        pricing_per_call: pricing_per_call ?? null, pricing_unit: pricing_unit || null,
        currency: currency || null, billing_contact: billing_contact || null,
        sla_percentage: sla_percentage ?? null, terms_and_conditions: terms_and_conditions || null,
        api_version: api_version || null, api_documentation: api_documentation || null,
        api_notes: api_notes || null, uat_api_key: uat_api_key || null,
        production_api_key: production_api_key || null, api_request_sample: api_request_sample || null,
        api_response_sample: api_response_sample || null,
        media_type: media_type || 'video', media_title: media_title || null,
        media_url: media_url || null, media_description: media_description || null,
        custom_commercial_fields: ccf, partner_rank: partner_rank ?? null,
        created_at: now, updated_at: now,
      }
    );

    const { rows: [inserted] } = await query(
      'SELECT * FROM initiative_partners WHERE id = :id FETCH FIRST 1 ROWS ONLY', { id }
    );
    res.status(201).json(processIP(inserted));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// PATCH /api/initiative-partners/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = buildUpdate(req.body, IP_FIELDS, [...IP_CLOB_JSON, ...IP_CLOB]);
    if (!upd) return res.status(400).json({ error: 'No updatable fields provided' });

    upd.params.id = req.params.id;
    await query(`UPDATE initiative_partners SET ${upd.sets.join(', ')} WHERE id = :id`, upd.params);

    const { rows: [updated] } = await query(
      'SELECT * FROM initiative_partners WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(processIP(updated));
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// DELETE /api/initiative-partners/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM initiative_partners WHERE id = :id', { id: req.params.id });
    res.status(204).send();
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
