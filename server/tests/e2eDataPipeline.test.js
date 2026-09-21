/**
 * CONSTELLATION — Phase 22 End-to-End Pipeline & Integration Test Suite
 *
 * Tests:
 * - Test A: Manual Entry (Person, Relationship, Location, Event)
 * - Test B: CSV Import & Field Mapping Pipeline
 * - Test C: JSON Import Pipeline
 * - Test D: Synthetic Scenario Generation (Scenarios A through F)
 * - Test E: Real Graph Entity Names & Attribute Resolution
 * - Test F: Graph Analytics Integrity over Ingested Data
 * - Test H: Malformed & Invalid Data Handling with Rejection Reporting
 * - Test I: Entity Resolution & Deduplication (Hardware IMEI, Phone, ID)
 * - Test J: Regression & Integrity
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/data/store.js';
import { runSeed } from '../src/data/seed/index.js';
import { ingestionService } from '../src/services/ingestionService.js';
import { syntheticGeneratorService } from '../src/services/syntheticGeneratorService.js';
import { AnalyticsService } from '../src/services/analyticsService.js';

describe('Phase 22: Comprehensive End-to-End Verification Suite', () => {
  beforeEach(() => {
    runSeed();
  });

  // ---------------------------------------------------------------------------
  // Test A: Manual Entry Workflow
  // ---------------------------------------------------------------------------
  it('Test A: Manual Entry creates Person, Relationship, Location, Event that reflect across views', async () => {
    const caseId = 'CASE-2024-VORTEX';

    const manualPayload = {
      source: 'manual',
      caseId,
      entities: [
        {
          id: 'PER-MANUAL-ADITYA',
          type: 'person',
          label: 'Aditya "Shadow" Rathore',
          subType: 'Logistics Facilitator',
          confidence: 0.96,
          attributes: {
            alias: 'Shadow',
            phoneNumber: '+91 98110 99881',
          },
        },
      ],
      relationships: [
        {
          id: 'REL-MANUAL-ADITYA-SULTAN',
          source: 'PER-MANUAL-ADITYA',
          target: 'PER-SULTAN-01', // Link to seed Kingpin
          type: 'COMMUNICATED_WITH',
          label: 'Encrypted Contact',
          confidence: 0.94,
          classification: 'FACT',
          provenance: 'DIRECT_OBSERVATION',
        },
      ],
      locations: [
        {
          id: 'LOC-MANUAL-SAFEHOUSE',
          name: 'Sector 62 Noida Safehouse',
          city: 'Noida',
          state: 'Uttar Pradesh',
          latitude: 28.6280,
          longitude: 77.3649,
          caseId,
          confidence: 0.98,
        },
      ],
      events: [
        {
          id: 'EVT-MANUAL-SURVEILLANCE',
          title: 'Physical Surveillance Intercept — Aditya Rendezvous',
          eventType: 'MEETING',
          timestamp: '2024-03-20T14:30:00.000Z',
          caseId,
          severity: 'HIGH',
        },
      ],
    };

    const result = await ingestionService.ingest(manualPayload);

    assert.equal(result.success, true);
    assert.equal(result.summary.accepted, 4);
    assert.equal(result.summary.rejected, 0);

    // Verify entity in store
    const ent = store.getEntity('PER-MANUAL-ADITYA');
    assert.ok(ent);
    assert.equal(ent.label, 'Aditya "Shadow" Rathore');
    assert.equal(ent.attributes.phoneNumber, '+919811099881'); // Normalized

    // Verify relationship in store
    const rel = store.getRelationship('REL-MANUAL-ADITYA-SULTAN');
    assert.ok(rel);
    assert.equal(rel.source, 'PER-MANUAL-ADITYA');
    assert.equal(rel.target, 'PER-SULTAN-01');

    // Verify location in store
    const loc = store.getLocation('LOC-MANUAL-SAFEHOUSE');
    assert.ok(loc);
    assert.equal(loc.city, 'Noida');

    // Verify event in store
    const ev = store.getEvent('EVT-MANUAL-SURVEILLANCE');
    assert.ok(ev);
    assert.equal(ev.eventType, 'MEETING');

    // Verify graph view retrieval
    const graph = store.getGraph({ caseId });
    const graphNode = graph.nodes.find(n => n.id === 'PER-MANUAL-ADITYA');
    const graphLink = graph.links.find(l => l.id === 'REL-MANUAL-ADITYA-SULTAN');
    assert.ok(graphNode, 'Entity must appear in 3D graph view');
    assert.ok(graphLink, 'Relationship must appear in 3D graph view');
  });

  // ---------------------------------------------------------------------------
  // Test B: CSV Import Simulation & Pipeline Verification
  // ---------------------------------------------------------------------------
  it('Test B: CSV Import normalizes, resolves, and populates graph, timeline, and geography', async () => {
    // Simulating parsed and mapped CSV records:
    const csvPayload = {
      source: 'file',
      caseId: 'CASE-2024-VORTEX',
      metadata: { filename: 'customs_seizure_log.csv' },
      entities: [
        {
          id: 'CSV-SUSPECT-01',
          type: 'suspect',
          label: 'Mohit Kumar',
          subType: 'Customs Clearing Agent',
          attributes: {
            plate: 'GJ-12-BB-8812',
            phoneNumber: '9825012345',
          },
        },
      ],
      relationships: [
        {
          id: 'CSV-REL-01',
          source: 'CSV-SUSPECT-01',
          target: 'PER-DRIVER-06', // Seed transporter
          type: 'ASSOCIATED_WITH',
        },
      ],
      locations: [
        {
          id: 'CSV-LOC-01',
          name: 'Mundra Port Container Freight Station',
          city: 'Mundra',
          latitude: 22.8389,
          longitude: 69.7214,
        },
      ],
      events: [
        {
          id: 'CSV-EVT-01',
          title: 'Customs Interception at Mundra Gate 3',
          eventType: 'RAID_SEIZURE',
          timestamp: '2024-03-22T08:15:00.000Z',
        },
      ],
    };

    // Dry-run preview first
    const preview = await ingestionService.ingest({ ...csvPayload, validateOnly: true });
    assert.equal(preview.summary.accepted, 4);
    assert.equal(preview.summary.rejected, 0);

    // Commit
    const commitResult = await ingestionService.ingest(csvPayload);
    assert.equal(commitResult.success, true);
    assert.equal(commitResult.summary.accepted, 4);

    // Verify Mundra location in geo store
    const locs = store.getAllLocations();
    const mundraLoc = locs.find(l => l.city === 'Mundra');
    assert.ok(mundraLoc, 'Imported location must exist in geospatial view');
    assert.equal(mundraLoc.latitude, 22.8389);

    // Verify timeline
    const events = store.getEventsByCase('CASE-2024-VORTEX');
    const seizureEv = events.find(e => e.id === 'CSV-EVT-01');
    assert.ok(seizureEv, 'Imported event must exist in timeline sequence');
  });

  // ---------------------------------------------------------------------------
  // Test C: JSON Import Pipeline
  // ---------------------------------------------------------------------------
  it('Test C: JSON Import correctly ingests structured telecommunications CDR batch', async () => {
    const jsonPayload = {
      source: 'file',
      caseId: 'CASE-2024-VORTEX',
      metadata: { filename: 'tower_cdr_dump.json' },
      entities: [
        {
          id: 'JSON-PHONE-01',
          type: 'phone',
          label: '+91 99999 88888',
          attributes: {
            phoneNumber: '+91 99999 88888',
            imei: '864209040112340', // Matches seed shared IMEI
          },
        },
      ],
    };

    const res = await ingestionService.ingest(jsonPayload);
    assert.equal(res.success, true);
    assert.equal(res.summary.accepted, 1);
  });

  // ---------------------------------------------------------------------------
  // Test D: Synthetic Generator Scenarios A through F
  // ---------------------------------------------------------------------------
  it('Test D: Synthetic Generator produces all 6 scenarios with real pipeline ingestion and provenance', async () => {
    const scenarios = ['SCENARIO_A', 'SCENARIO_B', 'SCENARIO_C', 'SCENARIO_D', 'SCENARIO_E', 'SCENARIO_F'];

    for (const sc of scenarios) {
      const genResult = await syntheticGeneratorService.generateAndIngest({
        scenario: sc,
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(genResult.success, true, `Scenario ${sc} must ingest successfully`);
      assert.ok(genResult.summary.accepted >= 15, `Scenario ${sc} must generate minimum required entities`);
      assert.equal(genResult.summary.rejected, 0, `Scenario ${sc} should have 0 rejections`);

      // Verify batch history has provenance
      const history = store.getIngestionHistory({ limit: 1 });
      assert.equal(history[0].source, 'synthetic');
      assert.equal(history[0].metadata.isSynthetic, true);
    }
  });

  // ---------------------------------------------------------------------------
  // Test E: Real Graph Entity Names (No Hardcoding)
  // ---------------------------------------------------------------------------
  it('Test E: Graph queries return actual dynamic entity labels from backend objects', () => {
    const graph = store.getGraph({ caseId: 'CASE-2024-VORTEX' });
    assert.ok(graph.nodes.length > 0);

    for (const node of graph.nodes) {
      assert.ok(node.label, `Node ${node.id} must have real label`);
      assert.ok(typeof node.label === 'string');
      assert.ok(node.label.trim().length > 0);
      assert.ok(node.type);
    }
  });

  // ---------------------------------------------------------------------------
  // Test F: Graph Analytics Integrity over Ingested Data
  // ---------------------------------------------------------------------------
  it('Test F: Graph Analytics calculates centrality and bridge nodes dynamically over new data', async () => {
    // Add a bridge entity connecting Sultan to an isolated cell
    await ingestionService.ingest({
      source: 'manual',
      caseId: 'CASE-2024-VORTEX',
      entities: [
        { id: 'ENT-BRIDGE-TEST', type: 'suspect', label: 'Bridge Agent' },
        { id: 'ENT-ISOLATED-LEAF', type: 'suspect', label: 'Isolated Leaf' },
      ],
      relationships: [
        { id: 'REL-BR-1', source: 'PER-SULTAN-01', target: 'ENT-BRIDGE-TEST', type: 'KNOWS' },
        { id: 'REL-BR-2', source: 'ENT-BRIDGE-TEST', target: 'ENT-ISOLATED-LEAF', type: 'KNOWS' },
      ],
    });

    const metrics = AnalyticsService.runFullAnalytics('CASE-2024-VORTEX');
    assert.ok(metrics.summary.totalNodes > 20);
    assert.ok(metrics.bridgeCandidates.length > 0);

    // Sultan should have high degree
    const sultanMetric = metrics.centrality.degree.find(d => d.entity.id === 'PER-SULTAN-01');
    assert.ok(sultanMetric && sultanMetric.score >= 3);
  });

  // ---------------------------------------------------------------------------
  // Test H: Invalid & Malformed File Handling
  // ---------------------------------------------------------------------------
  it('Test H: Ingestion reports exact rejection reasons for malformed data without data corruption', async () => {
    const invalidPayload = {
      source: 'file',
      caseId: 'CASE-2024-VORTEX',
      entities: [
        { id: 'INVALID-1', type: 'invalid_unsupported_type', label: 'Alien' },
        { id: 'INVALID-2', type: 'person', label: '' }, // empty label
        { id: 'INVALID-3', type: 'person', label: 'Negative Confidence', confidence: -2 },
      ],
      relationships: [
        { id: 'REL-DANGLING', source: 'GHOST-1', target: 'GHOST-2', type: 'KNOWS' },
      ],
    };

    const res = await ingestionService.ingest(invalidPayload);
    assert.equal(res.summary.submitted, 4);
    assert.equal(res.summary.accepted, 0);
    assert.equal(res.summary.rejected, 4);
    assert.equal(res.rejections.length, 4);

    // Verify exact reasons
    assert.match(res.rejections[0].reasons[0], /Invalid entity type/);
    assert.match(res.rejections[1].reasons[0], /non-empty string "label"/);
    assert.match(res.rejections[2].reasons[0], /between 0.0 and 1.0/);
    assert.match(res.rejections[3].reasons[0], /Referenced entity not found/);
  });

  // ---------------------------------------------------------------------------
  // Test I: Entity Resolution & Deduplication Verification
  // ---------------------------------------------------------------------------
  it('Test I: Entity Resolution deduplicates incoming records by ID, Phone, and Hardware IMEI', async () => {
    // Ingest initial device
    await ingestionService.ingest({
      source: 'manual',
      caseId: 'CASE-2024-VORTEX',
      entities: [
        {
          id: 'DEV-ORIGINAL-01',
          type: 'device',
          label: 'Seized Satellite Phone',
          attributes: { imei: '864999111222333', originalOwner: 'Target A' },
        },
      ],
    });

    // Ingest duplicate record with same IMEI but new ID and extra attribute
    const dupResult = await ingestionService.ingest({
      source: 'file',
      caseId: 'CASE-2024-VORTEX',
      entities: [
        {
          id: 'DEV-INCOMING-DUP-02',
          type: 'device',
          label: 'Telecom CDR Seizure Record',
          attributes: { imei: '864999111222333', recoveredCity: 'Mumbai' },
        },
      ],
    });

    assert.equal(dupResult.summary.entitiesCreated, 0);
    assert.equal(dupResult.summary.entitiesMerged, 1);
    assert.equal(dupResult.resolutionLog[0].action, 'MERGED');
    assert.equal(dupResult.resolutionLog[0].matchType, 'HARDWARE_IMEI');
    assert.equal(dupResult.resolutionLog[0].resolvedId, 'DEV-ORIGINAL-01');

    // Check merged attributes on original entity
    const resolvedEnt = store.getEntity('DEV-ORIGINAL-01');
    assert.equal(resolvedEnt.attributes.originalOwner, 'Target A');
    assert.equal(resolvedEnt.attributes.recoveredCity, 'Mumbai');
  });

  // ---------------------------------------------------------------------------
  // Test J: Regression Verification
  // ---------------------------------------------------------------------------
  it('Test J: Core investigative services remain 100% operational', () => {
    // Search
    const searchRes = store.search('Sultan');
    assert.ok(searchRes.length > 0);
    assert.equal(searchRes[0].id, 'PER-SULTAN-01');

    // Cases
    const cases = store.getAllCases();
    assert.equal(cases.length >= 3, true);

    // Locations
    const locs = store.getAllLocations();
    assert.ok(locs.length >= 8);

    // Events
    const events = store.getAllEvents();
    assert.ok(events.length >= 7);

    // Evidence
    const evidence = store.getAllEvidence();
    assert.ok(evidence.length >= 5);
  });
});
