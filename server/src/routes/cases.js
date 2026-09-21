/**
 * CONSTELLATION — Cases Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const casesRouter = Router();

// GET /api/cases
casesRouter.get('/', (_req, res) => {
  const cases = store.getAllCases();
  res.json({
    success: true,
    data: cases,
    meta: {
      count: cases.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/cases/:id
casesRouter.get('/:id', (req, res) => {
  const c = store.getCase(req.params.id);
  if (!c) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'CASE_NOT_FOUND',
        message: `Case with ID "${req.params.id}" was not found`,
      },
    });
  }

  // Also include summary counts
  const entityCount = store.getEntitiesByCase(c.id).length;
  const relCount = store.getRelationshipsByCase(c.id).length;
  const eventCount = store.getEventsByCase(c.id).length;
  const locationCount = store.getLocationsByCase(c.id).length;
  const evidenceCount = store.getEvidenceByCase(c.id).length;

  res.json({
    success: true,
    data: {
      ...c,
      metrics: {
        entities: entityCount,
        relationships: relCount,
        events: eventCount,
        locations: locationCount,
        evidence: evidenceCount,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
