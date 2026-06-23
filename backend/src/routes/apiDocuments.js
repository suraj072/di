import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { oraHttpStatus } from '../db/helpers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads/api-docs');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();

// GET /api/api-documents?initiativePartnerId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { initiativePartnerId } = req.query;
    if (!initiativePartnerId) return res.status(400).json({ error: 'initiativePartnerId required' });

    const { rows } = await query(
      'SELECT * FROM api_documents WHERE initiative_partner_id = :id ORDER BY created_at DESC',
      { id: initiativePartnerId }
    );
    res.json(rows);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// POST /api/api-documents  (multipart/form-data: file, initiative_partner_id, title)
router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { initiative_partner_id, title } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    if (!initiative_partner_id || !title) return res.status(400).json({ error: 'initiative_partner_id and title are required' });

    const id = randomUUID();
    const now = new Date();

    await query(
      `INSERT INTO api_documents (id, initiative_partner_id, title, file_path, file_name, created_at, updated_at)
       VALUES (:id, :ipId, :title, :file_path, :file_name, :created_at, :updated_at)`,
      { id, ipId: initiative_partner_id, title, file_path: req.file.filename, file_name: req.file.originalname, created_at: now, updated_at: now }
    );

    res.status(201).json({ id, initiative_partner_id, title, file_path: req.file.filename, file_name: req.file.originalname, created_at: now, updated_at: now });
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// DELETE /api/api-documents/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: [doc] } = await query(
      'SELECT * FROM api_documents WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(uploadsDir, doc.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await query('DELETE FROM api_documents WHERE id = :id', { id: req.params.id });
    res.status(204).send();
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

// GET /api/api-documents/:id/download
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const { rows: [doc] } = await query(
      'SELECT * FROM api_documents WHERE id = :id FETCH FIRST 1 ROWS ONLY',
      { id: req.params.id }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(uploadsDir, doc.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    res.download(filePath, doc.file_name);
  } catch (err) {
    res.status(oraHttpStatus(err)).json({ error: err.message });
  }
});

export default router;
