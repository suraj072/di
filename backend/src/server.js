import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { initPool } from './db/index.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes                     from './routes/auth.js';
import initiativeRoutes               from './routes/initiatives.js';
import partnerRoutes                  from './routes/partners.js';
import productRoutes                  from './routes/products.js';
import initiativePartnerRoutes        from './routes/initiativePartners.js';
import partnerFeatureRoutes           from './routes/partnerFeatures.js';
import initiativePartnerProductRoutes from './routes/initiativePartnerProducts.js';
import apiDocumentRoutes              from './routes/apiDocuments.js';
import adminRoutes                    from './routes/admin.js';
import mediaRoutes                    from './routes/media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:8080', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files — auth required
app.use('/api/uploads', requireAuth, express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',                        authRoutes);
app.use('/api/initiatives',                 initiativeRoutes);
app.use('/api/partners',                    partnerRoutes);
app.use('/api/products',                    productRoutes);
app.use('/api/initiative-partners',         initiativePartnerRoutes);
app.use('/api/partner-features',            partnerFeatureRoutes);
app.use('/api/initiative-partner-products', initiativePartnerProductRoutes);
app.use('/api/api-documents',               apiDocumentRoutes);
app.use('/api/admin',                       adminRoutes);
app.use('/api/media',                       mediaRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

// Initialise Oracle connection pool before accepting requests
initPool()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialise Oracle connection pool:', err.message);
    process.exit(1);
  });
