/**
 * CONSTELLATION — Evidence Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const evidenceRouter = Router();

// GET /api/evidence
evidenceRouter.get('/', (req, res) => {
  const { caseId, entityId, type } = req.query;

  let evidenceList = [];
  if (entityId) {
    evidenceList = store.getEvidenceByEntity(entityId);
  } else if (caseId) {
    evidenceList = store.getEvidenceByCase(caseId);
  } else {
    evidenceList = store.getAllEvidence();
  }

  if (type) {
    evidenceList = evidenceList.filter(e => e.evidenceType === type);
  }

  res.json({
    success: true,
    data: evidenceList,
    meta: {
      count: evidenceList.length,
      timestamp: new Date().toISOString(),
    },
  });
});

// GET /api/evidence/:id
evidenceRouter.get('/:id', (req, res) => {
  const ev = store.getEvidence(req.params.id);
  if (!ev) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Evidence "${req.params.id}" not found` },
    });
  }

  res.json({
    success: true,
    data: ev,
    meta: { timestamp: new Date().toISOString() },
  });
});
