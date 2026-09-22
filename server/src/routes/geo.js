/**
 * CONSTELLATION — Geospatial Intelligence Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const geoRouter = Router();

/**
 * Derives dynamic inter-city transit corridors and value flow arcs
 * from active case relationships and sequential movement events.
 */
export function buildDynamicTransitArcs({ locations = [], caseId = null, entityId = null }) {
  const arcs = [];
  const arcKeySet = new Set();

  // Create fast lookup of entityId -> locations
  const entityLocationMap = new Map();
  for (const loc of locations) {
    if (loc.entityId && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      if (!entityLocationMap.has(loc.entityId)) {
        entityLocationMap.set(loc.entityId, []);
      }
      entityLocationMap.get(loc.entityId).push(loc);
    }
  }

  // Get active relationships
  let relationships = [];
  if (entityId) {
    relationships = store.getRelationshipsByEntity(entityId);
  } else if (caseId) {
    relationships = store.getRelationshipsByCase(caseId);
  } else {
    relationships = store.getAllRelationships();
  }

  // 1. Cross-City Relationship Corridors (Hawala, Physical Haulage, Contraband, Comms)
  for (const rel of relationships) {
    const srcLocs = entityLocationMap.get(rel.source) || store.getLocationsByEntity(rel.source);
    const tgtLocs = entityLocationMap.get(rel.target) || store.getLocationsByEntity(rel.target);

    if (srcLocs && srcLocs.length > 0 && tgtLocs && tgtLocs.length > 0) {
      const srcLoc = srcLocs[0];
      const tgtLoc = tgtLocs[0];

      const latDiff = Math.abs(srcLoc.latitude - tgtLoc.latitude);
      const lngDiff = Math.abs(srcLoc.longitude - tgtLoc.longitude);
      const isCrossCity = latDiff > 0.05 || lngDiff > 0.05 || (srcLoc.city && tgtLoc.city && srcLoc.city.toLowerCase() !== tgtLoc.city.toLowerCase());

      if (isCrossCity) {
        const canonicalKey = `${srcLoc.city || srcLoc.name}::${tgtLoc.city || tgtLoc.name}::${rel.type}`;
        if (!arcKeySet.has(canonicalKey)) {
          arcKeySet.add(canonicalKey);

          const srcEntity = store.getEntity(rel.source);
          const tgtEntity = store.getEntity(rel.target);
          const srcLabel = srcEntity ? srcEntity.label : rel.source;
          const tgtLabel = tgtEntity ? tgtEntity.label : rel.target;

          let color = '#3b82f6';
          let arcType = rel.type || 'CORRIDOR';

          const relUpper = (rel.type || '').toUpperCase();
          if (['TRANSFERRED_TO', 'TRANSACTED_WITH', 'FINANCIALLY_LINKED', 'HAWALA'].some(k => relUpper.includes(k))) {
            color = '#00f2fe';
            arcType = 'HAWALA_ROUTING';
          } else if (['COMMUNICATED_WITH', 'CALL', 'VOIP', 'RELAY', 'SMS'].some(k => relUpper.includes(k))) {
            color = '#a855f7';
            arcType = 'CYBER_COMMUNICATION';
          } else if (['SUPPLIED_TO', 'SMUGGLED', 'CONTRABAND'].some(k => relUpper.includes(k))) {
            color = '#ef4444';
            arcType = 'CONTRABAND_CORRIDOR';
          } else if (['TRANSPORTED_TO', 'SHIPPED_TO', 'COURIER', 'VEHICLE'].some(k => relUpper.includes(k))) {
            color = '#f59e0b';
            arcType = 'PHYSICAL_HAULAGE';
          }

          arcs.push({
            id: `ARC-REL-${rel.id}`,
            name: `${srcLabel} ➔ ${tgtLabel} (${arcType.replace(/_/g, ' ')})`,
            fromCity: srcLoc.city || srcLoc.name || 'Origin',
            toCity: tgtLoc.city || tgtLoc.name || 'Destination',
            startLat: srcLoc.latitude,
            startLng: srcLoc.longitude,
            endLat: tgtLoc.latitude,
            endLng: tgtLoc.longitude,
            fromLat: srcLoc.latitude,
            fromLng: srcLoc.longitude,
            toLat: tgtLoc.latitude,
            toLng: tgtLoc.longitude,
            color,
            type: arcType,
            confidence: rel.confidence || 0.9,
            sourceEntityId: rel.source,
            targetEntityId: rel.target,
            entitiesInvolved: [rel.source, rel.target, srcLabel, tgtLabel],
            relationshipId: rel.id,
            metric: rel.metadata?.occurrenceCount || 1,
          });
        }
      }
    }
  }

  // 2. Sequential Movement / Event Corridors
  let events = [];
  if (entityId) {
    events = store.getEventsByEntity(entityId);
  } else if (caseId) {
    events = store.getEventsByCase(caseId);
  } else {
    events = store.getAllEvents();
  }

  const entityEventsMap = new Map();
  for (const ev of events) {
    for (const entId of (ev.entityIds || [])) {
      if (!entityEventsMap.has(entId)) {
        entityEventsMap.set(entId, []);
      }
      entityEventsMap.get(entId).push(ev);
    }
  }

  for (const [entId, entEvts] of entityEventsMap.entries()) {
    if (entEvts.length < 2) continue;
    const sorted = [...entEvts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (let i = 0; i < sorted.length - 1; i++) {
      const ev1 = sorted[i];
      const ev2 = sorted[i + 1];

      const loc1 = ev1.locationId ? store.getLocation(ev1.locationId) : null;
      const loc2 = ev2.locationId ? store.getLocation(ev2.locationId) : null;

      if (loc1 && loc2 && loc1.id !== loc2.id && (loc1.latitude !== loc2.latitude || loc1.longitude !== loc2.longitude)) {
        const canonicalKey = `TRANSIT::${loc1.city}::${loc2.city}::${entId}`;
        if (!arcKeySet.has(canonicalKey)) {
          arcKeySet.add(canonicalKey);
          const entity = store.getEntity(entId);
          const entLabel = entity ? entity.label : entId;

          arcs.push({
            id: `ARC-EVT-${ev1.id}-${ev2.id}`,
            name: `${entLabel} Movement (${loc1.city || 'Site A'} ➔ ${loc2.city || 'Site B'})`,
            fromCity: loc1.city || loc1.name || 'Origin',
            toCity: loc2.city || loc2.name || 'Destination',
            startLat: loc1.latitude,
            startLng: loc1.longitude,
            endLat: loc2.latitude,
            endLng: loc2.longitude,
            fromLat: loc1.latitude,
            fromLng: loc1.longitude,
            toLat: loc2.latitude,
            toLng: loc2.longitude,
            color: '#10b981',
            type: 'PHYSICAL_TRANSIT',
            confidence: 0.92,
            sourceEntityId: entId,
            targetEntityId: entId,
            entitiesInvolved: [entId, entLabel],
            metric: 1,
          });
        }
      }
    }
  }

  return arcs;
}

// GET /api/geo
geoRouter.get('/', (req, res) => {
  const { caseId, entityId, city, locationType } = req.query;

  let locations = [];
  if (entityId) {
    locations = store.getLocationsByEntity(entityId);
  } else if (caseId) {
    locations = store.getLocationsByCase(caseId);
  } else {
    locations = store.getAllLocations();
  }

  if (city) {
    locations = locations.filter(l => l.city.toLowerCase() === city.toLowerCase());
  }

  if (locationType) {
    locations = locations.filter(l => l.locationType === locationType);
  }

  // Dynamically derive transit corridors and inter-city value arcs
  const arcs = buildDynamicTransitArcs({ locations, caseId, entityId });

  res.json({
    success: true,
    data: {
      locations,
      arcs,
    },
    meta: {
      locationCount: locations.length,
      arcCount: arcs.length,
      timestamp: new Date().toISOString(),
    },
  });
});
