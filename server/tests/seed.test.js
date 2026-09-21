import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/data/store.js';
import { runSeed } from '../src/data/seed/index.js';

describe('Synthetic Dataset & Analytical Structure Verification', () => {
  before(() => {
    runSeed();
  });

  test('seeds all required cases, entities, and relationships', () => {
    const cases = store.getAllCases();
    assert.equal(cases.length, 3);

    const vortexCase = store.getCase('CASE-2024-VORTEX');
    assert.ok(vortexCase);
    assert.equal(vortexCase.status, 'ACTIVE');

    const entities = store.getAllEntities();
    assert.ok(entities.length >= 20);

    const rels = store.getAllRelationships();
    assert.ok(rels.length >= 20);
  });

  test('planted bridge node Karan "Munshi" Verma connects financial & logistics branches', () => {
    const munshiRels = store.getRelationshipsByEntity('PER-MUNSHI-02');
    assert.ok(munshiRels.length >= 4);

    // Check that Munshi has links to both financial entities and logistics entities
    const connectedNodeIds = munshiRels.map(r => r.source === 'PER-MUNSHI-02' ? r.target : r.source);
    
    // Connected to Sultan (Command)
    assert.ok(connectedNodeIds.includes('PER-SULTAN-01'));
    // Connected to Blade (Ground logistics)
    assert.ok(connectedNodeIds.includes('PER-BLADE-03'));
    // Connected to Golden Horizon (Front company)
    assert.ok(connectedNodeIds.includes('ORG-GOLDEN-02'));
  });

  test('planted shared IMEI anomaly connects burner phone to VoIP relay', () => {
    const burnerRel = store.getRelationshipsByEntity('PHO-BURNER-03');
    const imeiRel = burnerRel.find(r => r.target === 'PHO-CYBER-04' || r.source === 'PHO-CYBER-04');
    assert.ok(imeiRel);
    assert.equal(imeiRel.metadata.anomaly, 'CRITICAL_HARDWARE_REUSE');
  });

  test('temporal ordering: events can be sorted chronologically', () => {
    const events = store.getAllEvents();
    assert.ok(events.length >= 5);

    for (let i = 0; i < events.length - 1; i++) {
      const t1 = new Date(events[i].timestamp).getTime();
      const t2 = new Date(events[i + 1].timestamp).getTime();
      assert.ok(t1 <= t2, `Event ${events[i].id} must precede or equal ${events[i+1].id}`);
    }
  });

  test('geographic locations exist for all major Indian investigation hubs', () => {
    const locations = store.getAllLocations();
    const cities = new Set(locations.map(l => l.city));
    assert.ok(cities.has('New Delhi'));
    assert.ok(cities.has('Mumbai'));
    assert.ok(cities.has('Bengaluru'));
    assert.ok(cities.has('Kolkata'));
  });

  test('evidence chain of custody and provenance integrity is traceable', () => {
    const evidenceList = store.getAllEvidence();
    for (const ev of evidenceList) {
      assert.ok(ev.hash.startsWith('SHA256:'));
      assert.ok(ev.chainOfCustody.length > 0);
      assert.ok(ev.caseId);
    }
  });
});
