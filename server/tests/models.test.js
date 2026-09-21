import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEntity,
  validateEntity,
  createRelationship,
  validateRelationship,
  createLocation,
  validateLocation,
  createEvent,
  validateEvent,
  createEvidence,
  validateEvidence,
  createCase,
  validateCase,
} from '../src/models/index.js';
import { store } from '../src/data/store.js';
import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '@constellation/shared/constants.js';

describe('Data Models & Validation', () => {

  describe('Entity Model', () => {
    test('creates valid entity', () => {
      const ent = createEntity({
        id: 'SUSPECT-001',
        type: ENTITY_TYPES.SUSPECT,
        label: 'Vikram "Blade" Malhotra',
        caseIds: ['CASE-001'],
        confidence: 0.95,
        attributes: { alias: 'Blade', role: 'Logistics Coordinator' }
      });

      assert.equal(ent.id, 'SUSPECT-001');
      assert.equal(ent.type, 'suspect');
      assert.equal(ent.confidence, 0.95);
      assert.equal(ent.attributes.alias, 'Blade');
    });

    test('rejects invalid entity type', () => {
      const result = validateEntity({
        id: 'BAD-01',
        type: 'invalid_type_xyz',
        label: 'Bad Entity'
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors[0].includes('Invalid entity type'));
    });

    test('rejects missing label or id', () => {
      const res1 = validateEntity({ type: ENTITY_TYPES.PERSON });
      assert.equal(res1.valid, false);
      assert.ok(res1.errors.some(e => e.includes('id')));
      assert.ok(res1.errors.some(e => e.includes('label')));
    });
  });

  describe('Relationship Model', () => {
    test('creates valid relationship with provenance & classification', () => {
      const rel = createRelationship({
        id: 'REL-001',
        source: 'SUSPECT-001',
        target: 'SUSPECT-002',
        type: RELATIONSHIP_TYPES.COMMUNICATED_WITH,
        confidence: 0.88,
        caseIds: ['CASE-001'],
        provenance: 'EXTRACTED_CDR',
        classification: 'FACT'
      });

      assert.equal(rel.id, 'REL-001');
      assert.equal(rel.source, 'SUSPECT-001');
      assert.equal(rel.target, 'SUSPECT-002');
      assert.equal(rel.confidence, 0.88);
      assert.equal(rel.provenance, 'EXTRACTED_CDR');
    });

    test('rejects invalid relationship type', () => {
      const res = validateRelationship({
        id: 'REL-BAD',
        source: 'A',
        target: 'B',
        type: 'SUPER_FRIENDS'
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors[0].includes('Invalid relationship type'));
    });
  });

  describe('Location Model', () => {
    test('creates valid geographic location with Indian coordinates', () => {
      const loc = createLocation({
        id: 'LOC-DELHI-01',
        latitude: 28.6139,
        longitude: 77.2090,
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        confidence: 0.92
      });

      assert.equal(loc.city, 'New Delhi');
      assert.equal(loc.latitude, 28.6139);
      assert.equal(loc.longitude, 77.2090);
    });

    test('rejects out of bounds coordinates', () => {
      const res = validateLocation({
        id: 'LOC-BAD',
        latitude: 195.0, // Invalid lat
        longitude: 77.0,
        city: 'Bad City'
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('latitude')));
    });
  });

  describe('Event Model', () => {
    test('creates valid chronological event', () => {
      const ev = createEvent({
        id: 'EV-001',
        title: 'Clandestine Hawala Cash Drop',
        timestamp: '2024-03-15T14:30:00.000Z',
        eventType: 'TRANSACTION',
        entityIds: ['SUSPECT-001', 'SUSPECT-002'],
        severity: 'HIGH'
      });

      assert.equal(ev.id, 'EV-001');
      assert.equal(ev.eventType, 'TRANSACTION');
      assert.equal(ev.timestamp, '2024-03-15T14:30:00.000Z');
    });

    test('rejects invalid timestamp', () => {
      const res = validateEvent({
        id: 'EV-BAD',
        title: 'Bad Event',
        timestamp: 'not-a-date'
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('timestamp')));
    });
  });

  describe('Evidence Model', () => {
    test('creates valid evidence item with chain of custody', () => {
      const ev = createEvidence({
        id: 'EVID-001',
        title: 'Encrypted Samsung Galaxy Fold 5 Recovered from Safehouse',
        evidenceType: 'SEIZED_DEVICE',
        source: 'NIA Special Task Force Raid',
        classification: 'FACT',
        confidence: 0.99
      });

      assert.equal(ev.id, 'EVID-001');
      assert.equal(ev.evidenceType, 'SEIZED_DEVICE');
      assert.ok(ev.chainOfCustody.length > 0);
    });
  });

  describe('DataStore Operations', () => {
    beforeEach(() => {
      store.reset();
    });

    test('adds and retrieves entities and relationships with indexes', () => {
      store.addCase({ id: 'CASE-101', title: 'Operation Vortex' });

      const e1 = store.addEntity({
        id: 'PER-01',
        type: ENTITY_TYPES.SUSPECT,
        label: 'Tariq "Kingpin" Qureshi',
        caseIds: ['CASE-101'],
        attributes: { alias: 'Sultan' }
      });

      const e2 = store.addEntity({
        id: 'ORG-01',
        type: ENTITY_TYPES.ORGANIZATION,
        label: 'Al-Madina Freight Logistics FZE',
        caseIds: ['CASE-101']
      });

      const rel = store.addRelationship({
        id: 'R-01',
        source: 'PER-01',
        target: 'ORG-01',
        type: RELATIONSHIP_TYPES.OWNS,
        caseIds: ['CASE-101']
      });

      assert.equal(store.getEntity('PER-01').label, 'Tariq "Kingpin" Qureshi');
      assert.equal(store.getEntitiesByCase('CASE-101').length, 2);
      assert.equal(store.getRelationshipsByEntity('PER-01').length, 1);

      // Search test
      const results = store.search('Sultan');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, 'PER-01');

      // Graph extraction
      const graph = store.getGraph({ caseId: 'CASE-101' });
      assert.equal(graph.nodes.length, 2);
      assert.equal(graph.links.length, 1);
    });
  });
});
