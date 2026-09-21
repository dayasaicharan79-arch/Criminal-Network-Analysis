/**
 * CONSTELLATION — Analytics Routes
 */
import { Router } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';

export const analyticsRouter = Router();

// GET /api/analytics/path?from=...&to=...&caseId=...
analyticsRouter.get('/path', (req, res) => {
  const { from, to, caseId } = req.query;

  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Both "from" and "to" entity IDs are required' },
    });
  }

  const path = AnalyticsService.findShortestPath(from, to, caseId || null);

  if (!path) {
    return res.json({
      success: true,
      data: null,
      meta: { message: `No path exists between "${from}" and "${to}"` },
    });
  }

  res.json({
    success: true,
    data: path,
    meta: {
      distance: path.distance,
      nodeCount: path.nodes.length,
      linkCount: path.links.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/analytics/:caseId
analyticsRouter.get('/:caseId?', (req, res) => {
  const caseId = req.params.caseId || req.query.caseId || null;
  const results = AnalyticsService.runFullAnalytics(caseId);

  res.json({
    success: true,
    data: results,
    meta: {
      caseId,
      timestamp: new Date().toISOString(),
    },
  });
});
