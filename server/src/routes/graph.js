/**
 * CONSTELLATION — Graph Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const graphRouter = Router();

// GET /api/graph
graphRouter.get('/', (req, res) => {
  const { caseId, entityId, depth, typeFilter, minConfidence } = req.query;

  const parsedDepth = depth ? parseInt(depth, 10) : 1;
  const parsedConfidence = minConfidence ? parseFloat(minConfidence) : 0.0;
  const types = typeFilter ? (Array.isArray(typeFilter) ? typeFilter : typeFilter.split(',')) : null;

  const graph = store.getGraph({
    caseId: caseId || null,
    entityId: entityId || null,
    depth: parsedDepth,
    typeFilter: types,
    minConfidence: parsedConfidence,
  });

  res.json({
    success: true,
    data: graph,
    meta: {
      nodeCount: graph.nodes.length,
      linkCount: graph.links.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/graph/expand/:id
graphRouter.get('/expand/:id', (req, res) => {
  const { id } = req.params;
  const depth = req.query.depth ? parseInt(req.query.depth, 10) : 1;

  const ent = store.getEntity(id);
  if (!ent) {
    return res.status(404).json({
      success: false,
      error: { code: 'ENTITY_NOT_FOUND', message: `Cannot expand unknown entity "${id}"` },
    });
  }

  const graph = store.getGraph({ entityId: id, depth });

  res.json({
    success: true,
    data: graph,
    meta: {
      rootId: id,
      depth,
      nodeCount: graph.nodes.length,
      linkCount: graph.links.length,
      timestamp: new Date().toISOString(),
    },
  });
});
