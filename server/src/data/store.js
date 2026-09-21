/**
 * CONSTELLATION — In-Memory Indexed DataStore
 */
import {
  createEntity,
  createRelationship,
  createLocation,
  createEvent,
  createEvidence,
  createCase,
} from '../models/index.js';

class DataStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.entities = new Map();
    this.relationships = new Map();
    this.locations = new Map();
    this.events = new Map();
    this.evidence = new Map();
    this.cases = new Map();

    // Indexes
    this.indexEntitiesByCase = new Map();
    this.indexEntitiesByType = new Map();
    this.indexRelsByEntity = new Map();
    this.indexRelsByCase = new Map();
    this.indexLocationsByEntity = new Map();
    this.indexLocationsByCase = new Map();
    this.indexEventsByEntity = new Map();
    this.indexEventsByCase = new Map();
    this.indexEvidenceByEntity = new Map();
    this.indexEvidenceByCase = new Map();

    // Ingestion audit trail & provenance
    this.ingestionHistory = new Map();
  }

  // ---------------------------------------------------------------------------
  // Case Operations
  // ---------------------------------------------------------------------------
  addCase(data) {
    const c = createCase(data);
    this.cases.set(c.id, c);
    return c;
  }

  getCase(id) {
    return this.cases.get(id) || null;
  }

  getAllCases() {
    return Array.from(this.cases.values());
  }

  // ---------------------------------------------------------------------------
  // Entity Operations
  // ---------------------------------------------------------------------------
  addEntity(data) {
    const entity = createEntity(data);
    this.entities.set(entity.id, entity);

    // Type Index
    if (!this.indexEntitiesByType.has(entity.type)) {
      this.indexEntitiesByType.set(entity.type, new Set());
    }
    this.indexEntitiesByType.get(entity.type).add(entity.id);

    // Case Index
    for (const caseId of entity.caseIds) {
      if (!this.indexEntitiesByCase.has(caseId)) {
        this.indexEntitiesByCase.set(caseId, new Set());
      }
      this.indexEntitiesByCase.get(caseId).add(entity.id);
    }

    return entity;
  }

  getEntity(id) {
    return this.entities.get(id) || null;
  }

  updateEntity(id, updates = {}) {
    const existing = this.entities.get(id);
    if (!existing) return null;

    const mergedCaseIds = Array.isArray(updates.caseIds)
      ? [...new Set([...existing.caseIds, ...updates.caseIds])]
      : existing.caseIds;

    const updated = {
      ...existing,
      label: updates.label ? updates.label.trim() : existing.label,
      subType: updates.subType !== undefined ? updates.subType : existing.subType,
      caseIds: mergedCaseIds,
      confidence: updates.confidence !== undefined ? Math.max(existing.confidence, updates.confidence) : existing.confidence,
      attributes: {
        ...existing.attributes,
        ...(updates.attributes || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    this.entities.set(id, updated);

    // Update case index if new cases were associated
    for (const caseId of mergedCaseIds) {
      if (!this.indexEntitiesByCase.has(caseId)) {
        this.indexEntitiesByCase.set(caseId, new Set());
      }
      this.indexEntitiesByCase.get(caseId).add(id);
    }

    return updated;
  }

  getAllEntities() {
    return Array.from(this.entities.values());
  }

  getEntitiesByCase(caseId) {
    const ids = this.indexEntitiesByCase.get(caseId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.entities.get(id)).filter(Boolean);
  }

  getEntitiesByType(type) {
    const ids = this.indexEntitiesByType.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.entities.get(id)).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Relationship Operations
  // ---------------------------------------------------------------------------
  addRelationship(data) {
    const rel = createRelationship(data);
    this.relationships.set(rel.id, rel);

    // Entity Index (source & target)
    for (const entityId of [rel.source, rel.target]) {
      if (!this.indexRelsByEntity.has(entityId)) {
        this.indexRelsByEntity.set(entityId, new Set());
      }
      this.indexRelsByEntity.get(entityId).add(rel.id);
    }

    // Case Index
    for (const caseId of rel.caseIds) {
      if (!this.indexRelsByCase.has(caseId)) {
        this.indexRelsByCase.set(caseId, new Set());
      }
      this.indexRelsByCase.get(caseId).add(rel.id);
    }

    return rel;
  }

  getRelationship(id) {
    return this.relationships.get(id) || null;
  }

  getAllRelationships() {
    return Array.from(this.relationships.values());
  }

  getRelationshipsByEntity(entityId) {
    const ids = this.indexRelsByEntity.get(entityId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.relationships.get(id)).filter(Boolean);
  }

  getRelationshipsByCase(caseId) {
    const ids = this.indexRelsByCase.get(caseId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.relationships.get(id)).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Location Operations
  // ---------------------------------------------------------------------------
  addLocation(data) {
    const loc = createLocation(data);
    this.locations.set(loc.id, loc);

    if (loc.entityId) {
      if (!this.indexLocationsByEntity.has(loc.entityId)) {
        this.indexLocationsByEntity.set(loc.entityId, new Set());
      }
      this.indexLocationsByEntity.get(loc.entityId).add(loc.id);
    }

    if (loc.caseId) {
      if (!this.indexLocationsByCase.has(loc.caseId)) {
        this.indexLocationsByCase.set(loc.caseId, new Set());
      }
      this.indexLocationsByCase.get(loc.caseId).add(loc.id);
    }

    return loc;
  }

  getLocation(id) {
    return this.locations.get(id) || null;
  }

  getAllLocations() {
    return Array.from(this.locations.values());
  }

  getLocationsByEntity(entityId) {
    const ids = this.indexLocationsByEntity.get(entityId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.locations.get(id)).filter(Boolean);
  }

  getLocationsByCase(caseId) {
    const ids = this.indexLocationsByCase.get(caseId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.locations.get(id)).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Event & Timeline Operations
  // ---------------------------------------------------------------------------
  addEvent(data) {
    const ev = createEvent(data);
    this.events.set(ev.id, ev);

    if (ev.caseId) {
      if (!this.indexEventsByCase.has(ev.caseId)) {
        this.indexEventsByCase.set(ev.caseId, new Set());
      }
      this.indexEventsByCase.get(ev.caseId).add(ev.id);
    }

    for (const entityId of ev.entityIds) {
      if (!this.indexEventsByEntity.has(entityId)) {
        this.indexEventsByEntity.set(entityId, new Set());
      }
      this.indexEventsByEntity.get(entityId).add(ev.id);
    }

    return ev;
  }

  getEvent(id) {
    return this.events.get(id) || null;
  }

  getAllEvents() {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  getEventsByEntity(entityId) {
    const ids = this.indexEventsByEntity.get(entityId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.events.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getEventsByCase(caseId) {
    const ids = this.indexEventsByCase.get(caseId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.events.get(id))
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // ---------------------------------------------------------------------------
  // Evidence Operations
  // ---------------------------------------------------------------------------
  addEvidence(data) {
    const ev = createEvidence(data);
    this.evidence.set(ev.id, ev);

    if (ev.caseId) {
      if (!this.indexEvidenceByCase.has(ev.caseId)) {
        this.indexEvidenceByCase.set(ev.caseId, new Set());
      }
      this.indexEvidenceByCase.get(ev.caseId).add(ev.id);
    }

    for (const entityId of ev.entityIds) {
      if (!this.indexEvidenceByEntity.has(entityId)) {
        this.indexEvidenceByEntity.set(entityId, new Set());
      }
      this.indexEvidenceByEntity.get(entityId).add(ev.id);
    }

    return ev;
  }

  getEvidence(id) {
    return this.evidence.get(id) || null;
  }

  getAllEvidence() {
    return Array.from(this.evidence.values());
  }

  getEvidenceByEntity(entityId) {
    const ids = this.indexEvidenceByEntity.get(entityId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.evidence.get(id)).filter(Boolean);
  }

  getEvidenceByCase(caseId) {
    const ids = this.indexEvidenceByCase.get(caseId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.evidence.get(id)).filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // Graph Extraction & Expansion
  // ---------------------------------------------------------------------------
  getGraph({ caseId = null, entityId = null, depth = 1, typeFilter = null, minConfidence = 0.0 } = {}) {
    let nodeIds = new Set();
    let edgeIds = new Set();

    if (entityId) {
      // Traverse starting from entityId up to depth
      let currentLevel = new Set([entityId]);
      nodeIds.add(entityId);

      for (let d = 0; d < depth; d++) {
        const nextLevel = new Set();
        for (const currId of currentLevel) {
          const rels = this.getRelationshipsByEntity(currId);
          for (const rel of rels) {
            if (rel.confidence < minConfidence) continue;
            if (caseId && !rel.caseIds.includes(caseId)) continue;

            edgeIds.add(rel.id);
            const neighbor = rel.source === currId ? rel.target : rel.source;
            if (!nodeIds.has(neighbor)) {
              nodeIds.add(neighbor);
              nextLevel.add(neighbor);
            }
          }
        }
        currentLevel = nextLevel;
      }
    } else if (caseId) {
      // All entities & relationships for case
      const caseEntities = this.getEntitiesByCase(caseId);
      caseEntities.forEach(e => nodeIds.add(e.id));
      const caseRels = this.getRelationshipsByCase(caseId);
      caseRels.forEach(r => {
        if (r.confidence >= minConfidence) edgeIds.add(r.id);
      });
    } else {
      // Entire dataset
      this.entities.forEach(e => nodeIds.add(e.id));
      this.relationships.forEach(r => {
        if (r.confidence >= minConfidence) edgeIds.add(r.id);
      });
    }

    // Type filter
    if (typeFilter && typeFilter.length > 0) {
      const allowed = new Set(typeFilter);
      nodeIds = new Set(Array.from(nodeIds).filter(id => {
        const ent = this.entities.get(id);
        return ent && allowed.has(ent.type);
      }));
      // Retain only edges connecting preserved nodes
      edgeIds = new Set(Array.from(edgeIds).filter(id => {
        const rel = this.relationships.get(id);
        return rel && nodeIds.has(rel.source) && nodeIds.has(rel.target);
      }));
    }

    const nodes = Array.from(nodeIds).map(id => this.entities.get(id)).filter(Boolean);
    const links = Array.from(edgeIds).map(id => this.relationships.get(id)).filter(Boolean);

    return { nodes, links };
  }

  // ---------------------------------------------------------------------------
  // Multi-Attribute Search
  // ---------------------------------------------------------------------------
  search(query, { type = null, caseId = null, limit = 50 } = {}) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase().trim();

    let candidateEntities = caseId ? this.getEntitiesByCase(caseId) : this.getAllEntities();

    if (type) {
      candidateEntities = candidateEntities.filter(e => e.type === type);
    }

    const matches = [];

    for (const ent of candidateEntities) {
      let score = 0;
      const labelLower = ent.label.toLowerCase();
      const idLower = ent.id.toLowerCase();
      const subTypeLower = (ent.subType || '').toLowerCase();

      if (idLower === q) score += 100;
      else if (idLower.includes(q)) score += 40;

      if (labelLower === q) score += 90;
      else if (labelLower.startsWith(q)) score += 60;
      else if (labelLower.includes(q)) score += 30;

      if (subTypeLower.includes(q)) score += 20;

      // Attributes search (phone number, alias, vehicle plate, bank acct)
      if (ent.attributes) {
        for (const [key, val] of Object.entries(ent.attributes)) {
          const valStr = String(val).toLowerCase();
          if (valStr.includes(q)) {
            score += 25;
          }
        }
      }

      if (score > 0) {
        matches.push({ entity: ent, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map(m => m.entity);
  }

  // ---------------------------------------------------------------------------
  // Bulk Dataset Seeding
  // ---------------------------------------------------------------------------
  seed(dataset) {
    this.reset();

    if (dataset.cases) {
      for (const c of dataset.cases) this.addCase(c);
    }
    if (dataset.entities) {
      for (const e of dataset.entities) this.addEntity(e);
    }
    if (dataset.relationships) {
      for (const r of dataset.relationships) this.addRelationship(r);
    }
    if (dataset.locations) {
      for (const l of dataset.locations) this.addLocation(l);
    }
    if (dataset.events) {
      for (const ev of dataset.events) this.addEvent(ev);
    }
    if (dataset.evidence) {
      for (const ev of dataset.evidence) this.addEvidence(ev);
    }

    return {
      cases: this.cases.size,
      entities: this.entities.size,
      relationships: this.relationships.size,
      locations: this.locations.size,
      events: this.events.size,
      evidence: this.evidence.size,
    };
  }

  // ---------------------------------------------------------------------------
  // Ingestion & Provenance Audit History
  // ---------------------------------------------------------------------------
  addIngestionHistory(batch) {
    if (!this.ingestionHistory) {
      this.ingestionHistory = new Map();
    }
    this.ingestionHistory.set(batch.batchId, batch);
    return batch;
  }

  getIngestionHistory({ limit = 50 } = {}) {
    if (!this.ingestionHistory) return [];
    return Array.from(this.ingestionHistory.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  getIngestionHistoryById(batchId) {
    if (!this.ingestionHistory) return null;
    return this.ingestionHistory.get(batchId) || null;
  }
}

export const store = new DataStore();
export default store;
