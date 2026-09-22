/**
 * CONSTELLATION — Entity Resolution & Deduplication Service
 *
 * Discovers and merges duplicate entities across manual, file import,
 * and synthetic data streams using primary keys, telecommunication identifiers,
 * hardware IMEIs, vehicle registration plates, and case-scoped names.
 */
import { store } from '../data/store.js';

export class EntityResolutionService {
  constructor(dataStore = store) {
    this.store = dataStore;
  }

  /**
   * Resolves an incoming normalized entity against existing store records
   * and in-flight batch candidates.
   *
   * @param {Object} entity - Normalized incoming entity
   * @param {Map} inFlightBatch - Map of incomingId -> resolvedEntity for records in current batch
   * @returns {Object} Resolution result: { action: 'CREATED'|'MERGED', resolvedId, matchType, matchedRecord }
   */
  resolveEntity(entity, inFlightBatch = new Map()) {
    // 1. Check in-flight batch records first for batch-internal duplicates
    for (const [batchId, batchEntity] of inFlightBatch.entries()) {
      if (batchEntity.id === entity.id) {
        return {
          action: 'MERGED',
          resolvedId: batchEntity.id,
          matchType: 'BATCH_DUPLICATE_ID',
          matchedRecord: batchEntity,
        };
      }

      // Check phone match in-flight
      const batchPhone = this.extractPhone(batchEntity);
      const entityPhone = this.extractPhone(entity);
      if (batchPhone && entityPhone && batchPhone === entityPhone) {
        return {
          action: 'MERGED',
          resolvedId: batchEntity.id,
          matchType: 'BATCH_PHONE_NUMBER',
          matchedRecord: batchEntity,
        };
      }

      // Check IMEI match in-flight
      const batchIMEI = this.extractIMEI(batchEntity);
      const entityIMEI = this.extractIMEI(entity);
      if (batchIMEI && entityIMEI && batchIMEI === entityIMEI) {
        return {
          action: 'MERGED',
          resolvedId: batchEntity.id,
          matchType: 'BATCH_HARDWARE_IMEI',
          matchedRecord: batchEntity,
        };
      }

      // Check Vehicle plate match in-flight
      const batchPlate = this.extractPlate(batchEntity);
      const entityPlate = this.extractPlate(entity);
      if (batchPlate && entityPlate && batchPlate === entityPlate) {
        return {
          action: 'MERGED',
          resolvedId: batchEntity.id,
          matchType: 'BATCH_VEHICLE_PLATE',
          matchedRecord: batchEntity,
        };
      }
    }

    // 2. Check store for exact ID match
    if (entity.id) {
      const existing = this.store.getEntity(entity.id);
      if (existing) {
        return {
          action: 'MERGED',
          resolvedId: existing.id,
          matchType: 'EXACT_ID',
          matchedRecord: existing,
        };
      }
    }

    // 3. Check Phone Number match in store
    const phone = this.extractPhone(entity);
    if (phone) {
      const allPhones = this.store.getEntitiesByType('phone');
      for (const p of allPhones) {
        if (this.extractPhone(p) === phone) {
          return {
            action: 'MERGED',
            resolvedId: p.id,
            matchType: 'PHONE_NUMBER',
            matchedRecord: p,
          };
        }
      }
    }

    // 4. Check Hardware IMEI match in store
    const imei = this.extractIMEI(entity);
    if (imei) {
      const candidateEntities = [
        ...this.store.getEntitiesByType('device'),
        ...this.store.getEntitiesByType('phone'),
      ];
      for (const d of candidateEntities) {
        if (this.extractIMEI(d) === imei) {
          return {
            action: 'MERGED',
            resolvedId: d.id,
            matchType: 'HARDWARE_IMEI',
            matchedRecord: d,
          };
        }
      }
    }

    // 5. Check Vehicle Plate match in store
    const plate = this.extractPlate(entity);
    if (plate) {
      const allVehicles = this.store.getEntitiesByType('vehicle');
      for (const v of allVehicles) {
        if (this.extractPlate(v) === plate) {
          return {
            action: 'MERGED',
            resolvedId: v.id,
            matchType: 'VEHICLE_PLATE',
            matchedRecord: v,
          };
        }
      }
    }

    // 6. Check Case-Scoped Label match (Person / Suspect / Criminal / Organization)
    const HUMAN_TYPES = new Set(['person', 'suspect', 'criminal']);
    const isHumanCandidate = HUMAN_TYPES.has(entity.type);

    if (entity.caseIds && entity.caseIds.length > 0 && (isHumanCandidate || entity.type === 'organization')) {
      const normalizedLabel = entity.label.toLowerCase();
      const simpleIncoming = this.simplifyName(entity.label);

      for (const caseId of entity.caseIds) {
        const caseEntities = this.store.getEntitiesByCase(caseId);
        for (const ce of caseEntities) {
          const typeMatches = (isHumanCandidate && HUMAN_TYPES.has(ce.type)) || (ce.type === entity.type);
          if (!typeMatches) continue;

          const simpleExisting = this.simplifyName(ce.label);
          const alias = (ce.attributes && ce.attributes.alias) ? ce.attributes.alias.toLowerCase() : '';

          if (
            ce.label.toLowerCase() === normalizedLabel ||
            (simpleIncoming && simpleExisting && simpleIncoming === simpleExisting) ||
            (simpleIncoming && alias.includes(simpleIncoming))
          ) {
            return {
              action: 'MERGED',
              resolvedId: ce.id,
              matchType: 'LABEL_IN_CASE',
              matchedRecord: ce,
            };
          }
        }
      }
    }

    // 7. No match -> Brand new entity
    return {
      action: 'CREATED',
      resolvedId: entity.id,
      matchType: null,
      matchedRecord: null,
    };
  }

  simplifyName(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/["'][^"']*["']/g, '') // remove quoted nicknames e.g. "Sultan"
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractPhone(entity) {
    if (!entity) return null;
    const attrs = entity.attributes || {};
    return attrs.phoneNumber || attrs.number || attrs.phone || (entity.type === 'phone' ? entity.label : null);
  }

  extractIMEI(entity) {
    if (!entity) return null;
    const attrs = entity.attributes || {};
    return attrs.imei || attrs.hardwareId || null;
  }

  extractPlate(entity) {
    if (!entity) return null;
    const attrs = entity.attributes || {};
    return attrs.plate || attrs.registrationNumber || attrs.vehicleNumber || null;
  }

  /**
   * Computes deterministic canonical key for relationship deduplication.
   * Undirected types sort source and target alphabetically to guarantee canonical key.
   */
  computeRelationshipKey(rel, defaultCaseId = null) {
    const UNDIRECTED_TYPES = new Set([
      'KNOWS',
      'COMMUNICATED_WITH',
      'ASSOCIATED_WITH',
      'CONNECTED_TO',
      'RELATED_TO',
      'TRANSACTED_WITH',
      'SAME_SOURCE_IMAGE',
      'POTENTIAL_RELATIONSHIP',
    ]);

    const isUndirected = UNDIRECTED_TYPES.has(rel.type);
    const src = String(rel.source || '').trim();
    const tgt = String(rel.target || '').trim();
    const type = String(rel.type || '').trim();
    const cId = (rel.caseIds && rel.caseIds.length > 0) ? rel.caseIds[0] : (defaultCaseId || 'GLOBAL');

    if (isUndirected) {
      const first = src < tgt ? src : tgt;
      const second = src < tgt ? tgt : src;
      return `${cId}::${first}::${second}::${type}`;
    }
    return `${cId}::${src}::${tgt}::${type}`;
  }

  /**
   * Resolves an incoming normalized relationship against existing store records
   * and in-flight batch candidates to eliminate duplicate parallel edges.
   */
  resolveRelationship(rel, inFlightBatch = new Map(), defaultCaseId = null) {
    const relKey = this.computeRelationshipKey(rel, defaultCaseId);

    // 1. Check in-flight batch
    for (const [batchId, batchRel] of inFlightBatch.entries()) {
      if (batchRel.id === rel.id) {
        return {
          action: 'MERGED',
          resolvedId: batchRel.id,
          matchType: 'BATCH_DUPLICATE_ID',
          matchedRecord: batchRel,
        };
      }

      if (this.computeRelationshipKey(batchRel, defaultCaseId) === relKey) {
        return {
          action: 'MERGED',
          resolvedId: batchRel.id,
          matchType: 'BATCH_CANONICAL_LINK',
          matchedRecord: batchRel,
        };
      }
    }

    // 2. Check store for exact ID
    if (rel.id) {
      const existing = this.store.getRelationship(rel.id);
      if (existing) {
        return {
          action: 'MERGED',
          resolvedId: existing.id,
          matchType: 'EXACT_ID',
          matchedRecord: existing,
        };
      }
    }

    // 3. Check store for canonical link (source or target index lookup)
    const existingRels = this.store.getRelationshipsByEntity(rel.source);
    for (const er of existingRels) {
      if (this.computeRelationshipKey(er, defaultCaseId) === relKey) {
        return {
          action: 'MERGED',
          resolvedId: er.id,
          matchType: 'STORE_CANONICAL_LINK',
          matchedRecord: er,
        };
      }
    }

    // 4. Brand new relationship
    return {
      action: 'CREATED',
      resolvedId: rel.id,
      matchType: null,
      matchedRecord: null,
    };
  }
}

export const entityResolutionService = new EntityResolutionService();
export default entityResolutionService;
