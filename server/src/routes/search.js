/**
 * CONSTELLATION — Search Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const searchRouter = Router();

// GET /api/search?q=...&type=...&caseId=...&limit=...
searchRouter.get('/', (req, res) => {
  const { q, type, caseId, limit } = req.query;

  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.json({
      success: true,
      data: [],
      meta: { count: 0, query: '' },
    });
  }

  const results = store.search(q, {
    type: type || null,
    caseId: caseId || null,
    limit: limit ? parseInt(limit, 10) : 50,
  });

  // Enrich search results with relationship count and primary location
  const enriched = results.map(ent => {
    const rels = store.getRelationshipsByEntity(ent.id);
    const locs = store.getLocationsByEntity(ent.id);
    return {
      ...ent,
      connectionCount: rels.length,
      primaryLocation: locs.length > 0 ? { city: locs[0].city, country: locs[0].country } : null,
    };
  });

  res.json({
    success: true,
    data: enriched,
    meta: {
      query: q,
      count: enriched.length,
      timestamp: new Date().toISOString(),
    },
  });
});
