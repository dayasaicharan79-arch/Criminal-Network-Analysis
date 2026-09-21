/**
 * CONSTELLATION — Ingestion & Data Management Routes
 */
import { Router } from 'express';
import { ingestionService } from '../services/ingestionService.js';
import { syntheticGeneratorService, SCENARIO_DEFINITIONS, PRESET_CONFIGS } from '../services/syntheticGeneratorService.js';
import { store } from '../data/store.js';

export const ingestRouter = Router();

/**
 * GET /api/ingest/synthetic/scenarios
 * Available synthetic scenarios & presets
 */
ingestRouter.get('/synthetic/scenarios', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      scenarios: SCENARIO_DEFINITIONS,
      presets: PRESET_CONFIGS,
    },
  });
});

/**
 * POST /api/ingest/synthetic/generate
 * Generates coherent scenario and feeds into unified ingestion pipeline
 */
ingestRouter.post('/synthetic/generate', async (req, res, next) => {
  try {
    const {
      scenario = 'SCENARIO_A',
      preset = 'MEDIUM',
      entityCount,
      caseId = 'CASE-2024-VORTEX',
      density = 1.0,
    } = req.body;

    const result = await syntheticGeneratorService.generateAndIngest({
      scenario,
      preset,
      entityCount,
      caseId,
      density,
    });

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});


/**
 * POST /api/ingest
 * Primary unified ingestion pipeline for manual entry, file import, and synthetic generation
 */
ingestRouter.post('/', async (req, res, next) => {
  try {
    const {
      source = 'manual',
      caseId = null,
      entities = [],
      relationships = [],
      locations = [],
      events = [],
      evidence = [],
      metadata = {},
      validateOnly = false,
    } = req.body;

    const result = await ingestionService.ingest({
      source,
      caseId,
      entities,
      relationships,
      locations,
      events,
      evidence,
      metadata,
      validateOnly,
    });

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ingest/validate
 * Dry-run preview of validation, normalization, and entity resolution
 */
ingestRouter.post('/validate', async (req, res, next) => {
  try {
    const result = await ingestionService.ingest({
      ...req.body,
      validateOnly: true,
    });

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ingest/history
 * Ingestion provenance audit trail
 */
ingestRouter.get('/history', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = store.getIngestionHistory({ limit });

    res.status(200).json({
      success: true,
      data: history,
      meta: {
        count: history.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ingest/history/:id
 * Specific batch audit details
 */
ingestRouter.get('/history/:id', (req, res, next) => {
  try {
    const batch = store.getIngestionHistoryById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: `Ingestion batch "${req.params.id}" not found`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: batch,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default ingestRouter;
