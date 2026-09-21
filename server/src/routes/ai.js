/**
 * CONSTELLATION — AI Routes (Sherlock & Moriarty)
 */
import { Router } from 'express';
import { AIService } from '../services/aiService.js';

export const aiRouter = Router();

// POST /api/ai/sherlock
aiRouter.post('/sherlock', async (req, res, next) => {
  try {
    const { query, caseId, selectedEntityId, history } = req.body;
    const result = await AIService.querySherlock({
      query,
      caseId,
      selectedEntityId,
      history,
    });

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/moriarty
aiRouter.post('/moriarty', async (req, res, next) => {
  try {
    const { caseId, selectedEntityId } = req.body;
    const result = await AIService.queryMoriarty({
      caseId,
      selectedEntityId,
    });

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});
