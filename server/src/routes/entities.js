/**
 * CONSTELLATION — Entities Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const entitiesRouter = Router();

// GET /api/entities
entitiesRouter.get('/', (req, res) => {
  const { caseId, type, limit } = req.query;
  let entities = [];

  if (caseId) {
    entities = store.getEntitiesByCase(caseId);
  } else if (type) {
    entities = store.getEntitiesByType(type);
  } else {
    entities = store.getAllEntities();
  }

  if (type && caseId) {
    entities = entities.filter(e => e.type === type);
  }

  if (limit) {
    const l = parseInt(limit, 10);
    if (!isNaN(l)) entities = entities.slice(0, l);
  }

  res.json({
    success: true,
    data: entities,
    meta: {
      count: entities.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/entities/:id
entitiesRouter.get('/:id', (req, res) => {
  const ent = store.getEntity(req.params.id);
  if (!ent) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ENTITY_NOT_FOUND',
        message: `Entity with ID "${req.params.id}" was not found`,
      },
    });
  }

  // Enrich with relationship count, locations, events, and evidence
  const rels = store.getRelationshipsByEntity(ent.id);
  const locations = store.getLocationsByEntity(ent.id);
  const events = store.getEventsByEntity(ent.id);
  const evidence = store.getEvidenceByEntity(ent.id);

  res.json({
    success: true,
    data: {
      ...ent,
      connectionsCount: rels.length,
      locations,
      events,
      evidence,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/entities/:id/relationships
entitiesRouter.get('/:id/relationships', (req, res) => {
  const ent = store.getEntity(req.params.id);
  if (!ent) {
    return res.status(404).json({
      success: false,
      error: { code: 'ENTITY_NOT_FOUND', message: `Entity "${req.params.id}" not found` },
    });
  }

  const rels = store.getRelationshipsByEntity(ent.id);
  // Expand connected entity labels for immediate UI consumption
  const expanded = rels.map(r => {
    const otherId = r.source === ent.id ? r.target : r.source;
    const otherEntity = store.getEntity(otherId);
    return {
      ...r,
      direction: r.source === ent.id ? 'OUTGOING' : 'INCOMING',
      connectedEntity: otherEntity ? { id: otherEntity.id, label: otherEntity.label, type: otherEntity.type } : null,
    };
  });

  res.json({
    success: true,
    data: expanded,
    meta: {
      count: expanded.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/entities/:id/timeline
entitiesRouter.get('/:id/timeline', (req, res) => {
  const events = store.getEventsByEntity(req.params.id);
  res.json({
    success: true,
    data: events,
    meta: { count: events.length, timestamp: new Date().toISOString() },
  });
});

// GET /api/entities/:id/locations
entitiesRouter.get('/:id/locations', (req, res) => {
  const locs = store.getLocationsByEntity(req.params.id);
  res.json({
    success: true,
    data: locs,
    meta: { count: locs.length, timestamp: new Date().toISOString() },
  });
});

// GET /api/entities/:id/evidence
entitiesRouter.get('/:id/evidence', (req, res) => {
  const ev = store.getEvidenceByEntity(req.params.id);
  res.json({
    success: true,
    data: ev,
    meta: { count: ev.length, timestamp: new Date().toISOString() },
  });
});
