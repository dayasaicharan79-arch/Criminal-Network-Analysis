/**
 * CONSTELLATION — Phase 1 Ingestion Pipeline Test Suite
 *
 * Tests the unified data management system across:
 * - Validation & granular rejection reporting
 * - Multi-attribute normalization (phones, IMEIs, plates, timestamps, coordinates)
 * - Entity resolution (deduplication, primary key, hardware, telecom, case-scoped)
 * - Relationship translation and reference resolution
 * - Unified pipeline execution across manual, file, and synthetic paths
 * - Ingestion provenance audit logging
 * - Downstream graph, search, and analytics synchronization
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/data/store.js';
import { runSeed } from '../src/data/seed/index.js';
import { ingestionService } from '../src/services/ingestionService.js';
import {
  normalizePhoneNumber,
  normalizeIMEI,
  normalizeVehiclePlate,
  normalizeCoordinate,
  normalizeTimestamp,
} from '../src/services/normalizationService.js';

describe('Phase 1: Investigation Data Management & Ingestion Pipeline', () => {
  beforeEach(() => {
    runSeed();
  });

  // ---------------------------------------------------------------------------
  // 1. Normalization Engine Tests
  // ---------------------------------------------------------------------------
  describe('Normalization Engine', () => {
    it('normalizes Indian and international phone numbers into standard format', () => {
      assert.equal(normalizePhoneNumber('+91 91104-33812'), '+919110433812');
      assert.equal(normalizePhoneNumber('9876543210'), '+919876543210');
      assert.equal(normalizePhoneNumber('91-9876543210'), '+919876543210');
      assert.equal(normalizePhoneNumber('+971 50 123 4567'), '+971501234567');
    });

    it('normalizes hardware IMEI strings by stripping non-digit characters', () => {
      assert.equal(normalizeIMEI('864 209-040 112 340'), '864209040112340');
      assert.equal(normalizeIMEI(864209040112340), '864209040112340');
    });

    it('normalizes vehicle registration plates to uppercase alphanumeric strings', () => {
      assert.equal(normalizeVehiclePlate('dl - 10 - ca - 4491'), 'DL10CA4491');
      assert.equal(normalizeVehiclePlate('mh-01-ab-1234'), 'MH01AB1234');
    });

    it('normalizes geographic coordinates and rounds to 6 decimal places', () => {
      assert.equal(normalizeCoordinate('28.613938481', 'latitude'), 28.613938);
      assert.equal(normalizeCoordinate('77.209021519', 'longitude'), 77.209022);
      assert.equal(normalizeCoordinate(120, 'latitude'), null); // Out of bounds
      assert.equal(normalizeCoordinate('invalid', 'longitude'), null);
    });

    it('normalizes chronological timestamps to strict ISO 8601 strings', () => {
      const iso = normalizeTimestamp('2024-03-15T12:00:00Z');
      assert.equal(iso, '2024-03-15T12:00:00.000Z');
      assert.equal(normalizeTimestamp('invalid-date'), null);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Validation & Detailed Rejection Reporting
  // ---------------------------------------------------------------------------
  describe('Validation & Rejection Accounting', () => {
    it('accurately counts submitted, accepted, and rejected records with exact reasons', async () => {
      const payload = {
        source: 'manual',
        caseId: 'CASE-2024-VORTEX',
        entities: [
          // 1. Valid Person
          {
            id: 'PER-TEST-VALID-01',
            type: 'person',
            label: 'Aditya Sharma',
            confidence: 0.95,
          },
          // 2. Invalid Entity Type
          {
            id: 'PER-TEST-INVALID-02',
            type: 'invalid_extraterrestrial_type',
            label: 'Alien Contact',
          },
          // 3. Missing Label
          {
            id: 'PER-TEST-INVALID-03',
            type: 'person',
            label: '',
          },
          // 4. Invalid Confidence
          {
            id: 'PER-TEST-INVALID-04',
            type: 'person',
            label: 'Bad Confidence Person',
            confidence: 4.5,
          },
        ],
        relationships: [
          // 5. Valid Relationship between existing seed entities
          {
            id: 'REL-TEST-VALID-01',
            source: 'PER-SULTAN-01',
            target: 'PER-MUNSHI-02',
            type: 'CALLED',
            confidence: 0.88,
          },
          // 6. Invalid Relationship Type
          {
            id: 'REL-TEST-INVALID-02',
            source: 'PER-SULTAN-01',
            target: 'PER-MUNSHI-02',
            type: 'TELEPATHIC_LINK',
          },
          // 7. Dangling Entity Reference
          {
            id: 'REL-TEST-INVALID-03',
            source: 'NONEXISTENT-SOURCE',
            target: 'PER-MUNSHI-02',
            type: 'KNOWS',
          },
        ],
      };

      const result = await ingestionService.ingest(payload);

      assert.equal(result.success, true);
      assert.equal(result.summary.submitted, 7);
      assert.equal(result.summary.accepted, 2); // 1 entity + 1 rel
      assert.equal(result.summary.rejected, 5); // 3 entities + 2 rels
      assert.equal(result.rejections.length, 5);

      // Verify specific rejection reasons
      const typeError = result.rejections.find(r => r.identifier === 'PER-TEST-INVALID-02');
      assert.ok(typeError);
      assert.match(typeError.reasons[0], /Invalid entity type/);

      const labelError = result.rejections.find(r => r.identifier === 'PER-TEST-INVALID-03');
      assert.ok(labelError);
      assert.match(labelError.reasons[0], /non-empty string "label"/);

      const danglingError = result.rejections.find(r => r.identifier === 'REL-TEST-INVALID-03');
      assert.ok(danglingError);
      assert.match(danglingError.reasons[0], /Referenced entity not found/);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Entity Resolution & Attribute Merging
  // ---------------------------------------------------------------------------
  describe('Entity Resolution (Deduplication & Merging)', () => {
    it('merges new attributes into existing entity when ID matches', async () => {
      const payload = {
        source: 'manual',
        caseId: 'CASE-2024-VORTEX',
        entities: [
          {
            id: 'PER-MUNSHI-02', // Pre-existing bridge entity
            type: 'person',
            label: 'Karan Verma',
            attributes: {
              newSurveillanceNote: 'Spotted at Cyber Hub Gurugram',
              secondaryPassport: 'Z-88991122',
            },
          },
        ],
      };

      const result = await ingestionService.ingest(payload);

      assert.equal(result.summary.entitiesCreated, 0);
      assert.equal(result.summary.entitiesMerged, 1);
      assert.equal(result.resolutionLog[0].action, 'MERGED');
      assert.equal(result.resolutionLog[0].matchType, 'EXACT_ID');

      // Verify store updated entity
      const munshi = store.getEntity('PER-MUNSHI-02');
      assert.equal(munshi.attributes.newSurveillanceNote, 'Spotted at Cyber Hub Gurugram');
      assert.equal(munshi.attributes.secondaryPassport, 'Z-88991122');
      assert.equal(munshi.attributes.profession, 'Chartered Accountant & Hawala Bookmaker'); // Preserved original
    });

    it('merges incoming device entity when hardware IMEI matches', async () => {
      // In seed data: PHO-BURNER-03 has imei '86420904011234'
      const payload = {
        source: 'file',
        metadata: { filename: 'recovered_cell_log.csv' },
        entities: [
          {
            id: 'DEV-NEW-RECOVERED',
            type: 'device',
            label: 'Recovered Android Handset',
            attributes: {
              imei: '86420904011234', // Same IMEI as PHO-BURNER-03
              recoveryLocation: 'Mahipalpur Hotel Room 304',
            },
          },
        ],
      };

      const result = await ingestionService.ingest(payload);

      assert.equal(result.summary.entitiesMerged, 1);
      assert.equal(result.resolutionLog[0].action, 'MERGED');
      assert.equal(result.resolutionLog[0].matchType, 'HARDWARE_IMEI');
      assert.equal(result.resolutionLog[0].resolvedId, 'PHO-BURNER-03');

      // Verify merged into PHO-BURNER-03
      const burner = store.getEntity('PHO-BURNER-03');
      assert.equal(burner.attributes.recoveryLocation, 'Mahipalpur Hotel Room 304');
    });

    it('deduplicates multiple records within the same batch', async () => {
      const payload = {
        source: 'file',
        metadata: { filename: 'call_dump.csv' },
        entities: [
          {
            id: 'PHO-ROW-1',
            type: 'phone',
            label: 'Burner SIM A',
            attributes: { number: '+919988776655' },
          },
          {
            id: 'PHO-ROW-2',
            type: 'phone',
            label: 'Burner SIM A Duplicate',
            attributes: { number: '+919988776655' }, // Same phone number
          },
        ],
      };

      const result = await ingestionService.ingest(payload);

      assert.equal(result.summary.entitiesCreated, 1);
      assert.equal(result.summary.entitiesMerged, 1);
      assert.equal(result.resolutionLog[1].matchType, 'BATCH_PHONE_NUMBER');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Unified Ingestion Across All 3 Entry Paths
  // ---------------------------------------------------------------------------
  describe('Unified Entry Across Manual, File, and Synthetic Paths', () => {
    it('supports manual entry path and immediately reflects in Knowledge Graph', async () => {
      const payload = {
        source: 'manual',
        caseId: 'CASE-2024-VORTEX',
        entities: [
          {
            id: 'PER-NEW-INFORMANT-01',
            type: 'person',
            label: 'Rajesh "Khabri" Gupta',
            attributes: { role: 'Confidential Informant' },
          },
        ],
        relationships: [
          {
            source: 'PER-NEW-INFORMANT-01',
            target: 'PER-BLADE-03',
            type: 'ASSOCIATED_WITH',
            confidence: 0.85,
          },
        ],
      };

      const result = await ingestionService.ingest(payload);
      assert.equal(result.summary.entitiesCreated, 1);
      assert.equal(result.summary.relationshipsCreated, 1);

      // Verify knowledge graph immediately contains the new node and edge
      const graph = store.getGraph({ entityId: 'PER-NEW-INFORMANT-01', depth: 1 });
      assert.ok(graph.nodes.find(n => n.id === 'PER-NEW-INFORMANT-01'));
      assert.ok(graph.links.find(l => l.source === 'PER-NEW-INFORMANT-01' && l.target === 'PER-BLADE-03'));

      // Search immediately finds informant
      const searchResults = store.search('Khabri');
      assert.equal(searchResults.length, 1);
      assert.equal(searchResults[0].id, 'PER-NEW-INFORMANT-01');
    });

    it('supports file import path and translates relationships through entity resolution', async () => {
      const payload = {
        source: 'file',
        caseId: 'CASE-2024-VORTEX',
        metadata: { filename: 'forensic_extraction.json' },
        entities: [
          {
            id: 'IMPORT-TEMP-SULTAN',
            type: 'person',
            label: 'Tariq Mansoor', // Same name as PER-SULTAN-01
            attributes: { passportVerified: true },
          },
          {
            id: 'IMPORT-NEW-CONTACT',
            type: 'person',
            label: 'Bilal Khan',
          },
        ],
        relationships: [
          {
            id: 'REL-IMPORT-01',
            source: 'IMPORT-TEMP-SULTAN', // Resolves to PER-SULTAN-01
            target: 'IMPORT-NEW-CONTACT',
            type: 'COMMUNICATED_WITH',
          },
        ],
      };

      const result = await ingestionService.ingest(payload);
      assert.equal(result.summary.entitiesCreated, 1); // Bilal Khan
      assert.equal(result.summary.entitiesMerged, 1); // Sultan merged

      // Relationship source should have been translated to PER-SULTAN-01
      const createdRel = store.getRelationship('REL-IMPORT-01');
      assert.equal(createdRel.source, 'PER-SULTAN-01');
      assert.equal(createdRel.target, 'IMPORT-NEW-CONTACT');
    });

    it('supports synthetic generator path and populates locations, events, and evidence', async () => {
      const payload = {
        source: 'synthetic',
        caseId: 'CASE-SYNTHETIC-NARCO',
        metadata: { scenario: 'Cross-Border Narcotics Syndicate', scale: 'MEDIUM' },
        entities: [
          { id: 'NARCO-KINGPIN', type: 'person', label: 'Davinder Singh' },
          { id: 'NARCO-DEPOT', type: 'organization', label: 'Amritsar Cold Storage' },
        ],
        relationships: [
          { source: 'NARCO-KINGPIN', target: 'NARCO-DEPOT', type: 'OWNS' },
        ],
        locations: [
          {
            id: 'LOC-AMRITSAR-BORDER',
            name: 'Attari Border Outpost',
            city: 'Amritsar',
            latitude: 31.6042,
            longitude: 74.6053,
            locationType: 'TRANSIT_HUB',
          },
        ],
        events: [
          {
            id: 'EVT-BORDER-SEIZURE',
            title: 'Border Contraband Interception',
            timestamp: '2024-04-01T04:30:00Z',
            category: 'TACTICAL_OPERATION',
            entityIds: ['NARCO-KINGPIN', 'NARCO-DEPOT'],
          },
        ],
        evidence: [
          {
            id: 'EVI-PACKAGING-PHOTO',
            title: 'Photographic Exhibit of Consignment Markings',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            classification: 'PHYSICAL_FORENSIC',
          },
        ],
      };

      const result = await ingestionService.ingest(payload);
      assert.equal(result.success, true);
      assert.equal(result.summary.entitiesCreated, 2);
      assert.equal(result.summary.relationshipsCreated, 1);
      assert.equal(result.summary.locationsCreated, 1);
      assert.equal(result.summary.eventsCreated, 1);
      assert.equal(result.summary.evidenceCreated, 1);

      // Verify timeline reflects synthetic event
      const timelineEvents = store.getEventsByCase('CASE-SYNTHETIC-NARCO');
      assert.equal(timelineEvents.length, 1);
      assert.equal(timelineEvents[0].title, 'Border Contraband Interception');

      // Verify location reflects in store
      const loc = store.getLocation('LOC-AMRITSAR-BORDER');
      assert.equal(loc.city, 'Amritsar');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Ingestion Provenance & Audit History
  // ---------------------------------------------------------------------------
  describe('Provenance Audit Trail', () => {
    it('maintains a comprehensive audit log of all ingestion batches', async () => {
      await ingestionService.ingest({
        source: 'manual',
        metadata: { operator: 'Inspector Sharma' },
        entities: [{ id: 'ENT-AUDIT-01', type: 'person', label: 'Suraj Bhan' }],
      });

      const history = store.getIngestionHistory();
      assert.ok(history.length >= 1);
      const latest = history[0];

      assert.ok(latest.batchId.startsWith('BATCH-'));
      assert.equal(latest.source, 'manual');
      assert.equal(latest.metadata.operator, 'Inspector Sharma');
      assert.equal(latest.summary.entitiesCreated, 1);
      assert.ok(Array.isArray(latest.resolutionLog));
      assert.ok(Array.isArray(latest.rejections));
    });

    it('supports dry-run validation preview without modifying database', async () => {
      const initialCount = store.getAllEntities().length;

      const preview = await ingestionService.ingest({
        source: 'file',
        validateOnly: true,
        entities: [{ id: 'ENT-PREVIEW-ONLY', type: 'person', label: 'Ghost Contact' }],
      });

      assert.equal(preview.summary.entitiesCreated, 1);
      assert.equal(preview.batchRecord.committed, false);

      // DataStore entity count must NOT have changed
      assert.equal(store.getAllEntities().length, initialCount);
      assert.equal(store.getEntity('ENT-PREVIEW-ONLY'), null);
    });
  });
});
