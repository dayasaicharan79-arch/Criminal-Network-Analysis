import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { casesRouter } from './routes/cases.js';
import { entitiesRouter } from './routes/entities.js';
import { searchRouter } from './routes/search.js';
import { graphRouter } from './routes/graph.js';
import { analyticsRouter } from './routes/analytics.js';
import { timelineRouter } from './routes/timeline.js';
import { geoRouter } from './routes/geo.js';
import { evidenceRouter } from './routes/evidence.js';
import { aiRouter } from './routes/ai.js';
import { ingestRouter } from './routes/ingest.js';
import { runSeed } from './data/seed/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// ---------------------------------------------------------------------------
// Seed Synthetic Dataset
// ---------------------------------------------------------------------------
runSeed();

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api', healthRouter);
app.use('/api/cases', casesRouter);
app.use('/api/entities', entitiesRouter);
app.use('/api/search', searchRouter);
app.use('/api/graph', graphRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/geo', geoRouter);
app.use('/api/evidence', evidenceRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ingest', ingestRouter);

// Catch-all for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found',
    },
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n  ✦  CONSTELLATION Server`);
  console.log(`     Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`     Port        : ${PORT}`);
  console.log(`     Health      : http://localhost:${PORT}/api/health\n`);
});

export default app;
