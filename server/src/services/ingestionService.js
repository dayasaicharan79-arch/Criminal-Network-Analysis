/**
 * CONSTELLATION — Unified Ingestion Pipeline Service
 *
 * Implements the single canonical ingestion pipeline for:
 * - Manual data entry
 * - File-based data import
 * - Synthetic data generation
 *
 * Pipeline Flow:
 * INPUT BATCH -> VALIDATION -> NORMALIZATION -> ENTITY RESOLUTION -> KNOWLEDGE GRAPH -> AUDIT LOG
 */
import { store } from '../data/store.js';
import {
  validateEntity,
  validateRelationship,
  validateLocation,
  validateEvent,
  validateEvidence,
} from '../models/index.js';
import {
  normalizeEntity,
  normalizeRelationship,
  normalizeLocation,
  normalizeEvent,
  normalizeEvidence,
} from './normalizationService.js';
import { entityResolutionService } from './entityResolutionService.js';

export class IngestionService {
  constructor(dataStore = store, resolutionSvc = entityResolutionService) {
    this.store = dataStore;
    this.resolution = resolutionSvc;
  }

  /**
   * Primary entry point for all data ingestion
   *
   * @param {Object} options
   * @param {'manual'|'file'|'synthetic'} options.source - Data entry path
   * @param {string} [options.caseId] - Associated investigation case
   * @param {Array} [options.entities] - Raw entities
   * @param {Array} [options.relationships] - Raw relationships
   * @param {Array} [options.locations] - Raw locations
   * @param {Array} [options.events] - Raw events
   * @param {Array} [options.evidence] - Raw evidence items
   * @param {Object} [options.metadata] - Metadata (filename, user, scenario, etc.)
   * @param {boolean} [options.validateOnly] - Dry-run validation preview without database commit
   * @returns {Object} Comprehensive ingestion result and provenance audit
   */
  async ingest({
    source = 'manual',
    caseId = null,
    entities = [],
    relationships = [],
    locations = [],
    events = [],
    evidence = [],
    metadata = {},
    validateOnly = false,
  } = {}) {
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const rejections = [];
    const resolutionLog = [];
    const idMap = new Map(); // incomingId -> resolvedId

    let totalSubmitted = 0;
    let totalAccepted = 0;

    // -------------------------------------------------------------------------
    // 1. ENTITY INGESTION PIPELINE
    // -------------------------------------------------------------------------
    const validEntities = [];
    const inFlightBatch = new Map();
    const entitiesToCreate = [];
    const entitiesToUpdate = new Map(); // resolvedId -> mergedAttributes

    for (let idx = 0; idx < entities.length; idx++) {
      totalSubmitted++;
      const raw = { ...entities[idx] };

      // Ensure entity ID exists or generate deterministic ID
      if (!raw.id || typeof raw.id !== 'string' || raw.id.trim() === '') {
        const typePrefix = (raw.type || 'ent').substring(0, 3).toUpperCase();
        raw.id = `${typePrefix}-${Date.now()}-${idx + 1}`;
      }

      // Attach caseId if specified
      if (caseId) {
        raw.caseIds = raw.caseIds || [];
        if (!raw.caseIds.includes(caseId)) {
          raw.caseIds.push(caseId);
        }
      }

      // 1a. Normalization
      const normalized = normalizeEntity(raw);

      // 1b. Validation
      const validation = validateEntity(normalized);
      if (!validation.valid) {
        rejections.push({
          type: 'entity',
          index: idx,
          identifier: raw.id,
          label: raw.label || '(unlabeled)',
          reasons: validation.errors,
        });
        continue;
      }

      // 1c. Entity Resolution (Deduplication & Attribute Merging)
      const resolution = this.resolution.resolveEntity(normalized, inFlightBatch);

      if (resolution.action === 'MERGED') {
        idMap.set(normalized.id, resolution.resolvedId);
        resolutionLog.push({
          action: 'MERGED',
          incomingId: normalized.id,
          resolvedId: resolution.resolvedId,
          matchType: resolution.matchType,
          label: normalized.label,
        });

        // Queue attribute merge
        const existingMerged = entitiesToUpdate.get(resolution.resolvedId) || {};
        entitiesToUpdate.set(resolution.resolvedId, {
          caseIds: [...new Set([...(existingMerged.caseIds || []), ...(normalized.caseIds || [])])],
          attributes: { ...(existingMerged.attributes || {}), ...(normalized.attributes || {}) },
          confidence: Math.max(existingMerged.confidence || 0, normalized.confidence || 1.0),
        });
      } else {
        idMap.set(normalized.id, normalized.id);
        inFlightBatch.set(normalized.id, normalized);
        entitiesToCreate.push(normalized);
        resolutionLog.push({
          action: 'CREATED',
          incomingId: normalized.id,
          resolvedId: normalized.id,
          matchType: null,
          label: normalized.label,
        });
      }

      totalAccepted++;
    }

    // -------------------------------------------------------------------------
    // 2. RELATIONSHIP INGESTION PIPELINE
    // -------------------------------------------------------------------------
    const relationshipsToCreate = [];

    for (let idx = 0; idx < relationships.length; idx++) {
      totalSubmitted++;
      const raw = { ...relationships[idx] };

      if (!raw.id || typeof raw.id !== 'string' || raw.id.trim() === '') {
        raw.id = `REL-${Date.now()}-${idx + 1}`;
      }

      if (caseId) {
        raw.caseIds = raw.caseIds || [];
        if (!raw.caseIds.includes(caseId)) {
          raw.caseIds.push(caseId);
        }
      }

      // 2a. Normalization
      const normalized = normalizeRelationship(raw);

      // Translate source & target through entity resolution map
      const resolvedSource = idMap.get(normalized.source) || normalized.source;
      const resolvedTarget = idMap.get(normalized.target) || normalized.target;
      normalized.source = resolvedSource;
      normalized.target = resolvedTarget;

      // 2b. Validation
      const validation = validateRelationship(normalized);
      if (!validation.valid) {
        rejections.push({
          type: 'relationship',
          index: idx,
          identifier: raw.id,
          reasons: validation.errors,
        });
        continue;
      }

      // Verify that source and target entities exist in store or current batch
      const sourceExists = this.store.getEntity(resolvedSource) || inFlightBatch.has(resolvedSource);
      const targetExists = this.store.getEntity(resolvedTarget) || inFlightBatch.has(resolvedTarget);

      if (!sourceExists || !targetExists) {
        const missing = [];
        if (!sourceExists) missing.push(`source "${resolvedSource}"`);
        if (!targetExists) missing.push(`target "${resolvedTarget}"`);
        rejections.push({
          type: 'relationship',
          index: idx,
          identifier: raw.id,
          reasons: [`Referenced entity not found in dataset: ${missing.join(', ')}`],
        });
        continue;
      }

      relationshipsToCreate.push(normalized);
      totalAccepted++;
    }

    // -------------------------------------------------------------------------
    // 3. LOCATIONS INGESTION PIPELINE
    // -------------------------------------------------------------------------
    const locationsToCreate = [];

    for (let idx = 0; idx < locations.length; idx++) {
      totalSubmitted++;
      const raw = { ...locations[idx] };

      if (!raw.id || typeof raw.id !== 'string' || raw.id.trim() === '') {
        raw.id = `LOC-${Date.now()}-${idx + 1}`;
      }

      if (caseId && !raw.caseId) {
        raw.caseId = caseId;
      }

      // Translate referenced entityId
      if (raw.entityId && idMap.has(raw.entityId)) {
        raw.entityId = idMap.get(raw.entityId);
      }

      const normalized = normalizeLocation(raw);
      const validation = validateLocation(normalized);

      if (!validation.valid) {
        rejections.push({
          type: 'location',
          index: idx,
          identifier: raw.id,
          reasons: validation.errors,
        });
        continue;
      }

      locationsToCreate.push(normalized);
      totalAccepted++;
    }

    // -------------------------------------------------------------------------
    // 4. TIMELINE EVENTS INGESTION PIPELINE
    // -------------------------------------------------------------------------
    const eventsToCreate = [];

    for (let idx = 0; idx < events.length; idx++) {
      totalSubmitted++;
      const raw = { ...events[idx] };

      if (!raw.id || typeof raw.id !== 'string' || raw.id.trim() === '') {
        raw.id = `EVT-${Date.now()}-${idx + 1}`;
      }

      if (caseId && !raw.caseId) {
        raw.caseId = caseId;
      }

      // Translate referenced entityIds
      if (Array.isArray(raw.entityIds)) {
        raw.entityIds = raw.entityIds.map(eId => idMap.get(eId) || eId);
      }

      const normalized = normalizeEvent(raw);
      const validation = validateEvent(normalized);

      if (!validation.valid) {
        rejections.push({
          type: 'event',
          index: idx,
          identifier: raw.id,
          reasons: validation.errors,
        });
        continue;
      }

      eventsToCreate.push(normalized);
      totalAccepted++;
    }

    // -------------------------------------------------------------------------
    // 5. EVIDENCE INGESTION PIPELINE
    // -------------------------------------------------------------------------
    const evidenceToCreate = [];

    for (let idx = 0; idx < evidence.length; idx++) {
      totalSubmitted++;
      const raw = { ...evidence[idx] };

      if (!raw.id || typeof raw.id !== 'string' || raw.id.trim() === '') {
        raw.id = `EVI-${Date.now()}-${idx + 1}`;
      }

      if (caseId && !raw.caseId) {
        raw.caseId = caseId;
      }

      // Translate referenced entityIds
      if (Array.isArray(raw.entityIds)) {
        raw.entityIds = raw.entityIds.map(eId => idMap.get(eId) || eId);
      }

      const normalized = normalizeEvidence(raw);
      const validation = validateEvidence(normalized);

      if (!validation.valid) {
        rejections.push({
          type: 'evidence',
          index: idx,
          identifier: raw.id,
          reasons: validation.errors,
        });
        continue;
      }

      evidenceToCreate.push(normalized);
      totalAccepted++;
    }

    // -------------------------------------------------------------------------
    // 6. COMMIT TO DATASTORE (Skipped if validateOnly is true)
    // -------------------------------------------------------------------------
    if (!validateOnly) {
      // Create new entities
      for (const ent of entitiesToCreate) {
        this.store.addEntity(ent);
      }

      // Apply merged attributes to existing entities
      for (const [resId, updates] of entitiesToUpdate.entries()) {
        this.store.updateEntity(resId, updates);
      }

      // Create relationships
      for (const rel of relationshipsToCreate) {
        this.store.addRelationship(rel);
      }

      // Create locations
      for (const loc of locationsToCreate) {
        this.store.addLocation(loc);
      }

      // Create events
      for (const ev of eventsToCreate) {
        this.store.addEvent(ev);
      }

      // Create evidence
      for (const evi of evidenceToCreate) {
        this.store.addEvidence(evi);
      }
    }

    // -------------------------------------------------------------------------
    // 7. INGESTION PROVENANCE AUDIT LOGGING
    // -------------------------------------------------------------------------
    const summary = {
      submitted: totalSubmitted,
      accepted: totalAccepted,
      rejected: rejections.length,
      entitiesCreated: entitiesToCreate.length,
      entitiesMerged: entitiesToUpdate.size,
      relationshipsCreated: relationshipsToCreate.length,
      locationsCreated: locationsToCreate.length,
      eventsCreated: eventsToCreate.length,
      evidenceCreated: evidenceToCreate.length,
    };

    const batchRecord = {
      batchId,
      source,
      timestamp,
      caseId,
      metadata: { ...metadata },
      summary,
      rejections,
      resolutionLog,
      committed: !validateOnly,
    };

    if (!validateOnly) {
      this.store.addIngestionHistory(batchRecord);
    }

    return {
      success: true,
      batchId,
      summary,
      rejections,
      resolutionLog,
      batchRecord,
    };
  }
}

export const ingestionService = new IngestionService();
export default ingestionService;
