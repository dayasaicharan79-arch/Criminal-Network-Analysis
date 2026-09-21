/**
 * CONSTELLATION — Timeline Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const timelineRouter = Router();

// GET /api/timeline
timelineRouter.get('/', (req, res) => {
  const { caseId, entityId, eventType, start, end } = req.query;

  let events = [];
  if (entityId) {
    events = store.getEventsByEntity(entityId);
  } else if (caseId) {
    events = store.getEventsByCase(caseId);
  } else {
    events = store.getAllEvents();
  }

  // Filter by event type
  if (eventType) {
    const types = Array.isArray(eventType) ? eventType : eventType.split(',');
    const typeSet = new Set(types);
    events = events.filter(e => typeSet.has(e.eventType));
  }

  // Filter by time range
  if (start) {
    const startTime = new Date(start).getTime();
    if (!isNaN(startTime)) {
      events = events.filter(e => new Date(e.timestamp).getTime() >= startTime);
    }
  }

  if (end) {
    const endTime = new Date(end).getTime();
    if (!isNaN(endTime)) {
      events = events.filter(e => new Date(e.timestamp).getTime() <= endTime);
    }
  }

  res.json({
    success: true,
    data: events,
    meta: {
      count: events.length,
      timestamp: new Date().toISOString(),
    },
  });
});
