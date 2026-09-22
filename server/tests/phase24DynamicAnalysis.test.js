/**
 * CONSTELLATION — Phase 24 Dynamic Analysis & Intelligence Ingestion Test Suite
 * 
 * Verifies:
 * 1. Relationship Deduplication & Canonical Merging
 * 2. File -> Evidence Exhibit Ingestion & SHA-256 Custody
 * 3. Dynamic Geospatial Transit Arcs (No Static Arcs)
 * 4. Dynamic Moriarty Adversarial Engine (Case-Grounded & Isolated)
 * 5. Sherlock Query Expansion (Shortest Path, Identifiers, Dates)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { runSeed } from '../src/data/seed/index.js';
import { store } from '../src/data/store.js';
import { entityResolutionService } from '../src/services/entityResolutionService.js';
import { ingestionService } from '../src/services/ingestionService.js';
import { buildDynamicTransitArcs } from '../src/routes/geo.js';
import { MoriartyEngine } from '../src/services/moriartyEngine.js';
import { AIService } from '../src/services/aiService.js';
import { buildIngestionPayloadFromMapping } from '../../client/src/utils/fileParsers.js';

describe('Phase 24: Dynamic Analysis & Intelligence Ingestion', () => {
  before(() => {
    runSeed();
  });

  // ===========================================================================
  // 1. RELATIONSHIP DEDUPLICATION & CANONICAL MERGING
  // ===========================================================================
  describe('1. Relationship Deduplication & Canonical Keying', () => {
    it('computes symmetric canonical keys for undirected relationships', () => {
      const relA = {
        source: 'ENT-ALPHA',
        target: 'ENT-BETA',
        type: 'COMMUNICATED_WITH',
        caseIds: ['CASE-001'],
      };
      const relB = {
        source: 'ENT-BETA',
        target: 'ENT-ALPHA',
        type: 'COMMUNICATED_WITH',
        caseIds: ['CASE-001'],
      };

      const keyA = entityResolutionService.computeRelationshipKey(relA, 'CASE-001');
      const keyB = entityResolutionService.computeRelationshipKey(relB, 'CASE-001');
      assert.strictEqual(keyA, keyB, 'Undirected relationships must produce identical canonical key regardless of direction');
      assert.strictEqual(keyA, 'CASE-001::ENT-ALPHA::ENT-BETA::COMMUNICATED_WITH');
    });

    it('computes asymmetric keys for directed relationships', () => {
      const relDirA = {
        source: 'ENT-ALPHA',
        target: 'ENT-BETA',
        type: 'TRANSFERRED_TO',
        caseIds: ['CASE-001'],
      };
      const relDirB = {
        source: 'ENT-BETA',
        target: 'ENT-ALPHA',
        type: 'TRANSFERRED_TO',
        caseIds: ['CASE-001'],
      };

      const keyDirA = entityResolutionService.computeRelationshipKey(relDirA, 'CASE-001');
      const keyDirB = entityResolutionService.computeRelationshipKey(relDirB, 'CASE-001');
      assert.notStrictEqual(keyDirA, keyDirB, 'Directed relationships must have distinct directional keys');
    });

    it('deduplicates parallel edges in the same batch and merges occurrences', async () => {
      const payload = {
        source: 'file',
        caseId: 'CASE-2024-VORTEX',
        entities: [
          {
            id: 'ENT-PARALLEL-A',
            label: 'Surveillance Target A',
            type: 'person',
            caseIds: ['CASE-2024-VORTEX'],
          },
          {
            id: 'ENT-PARALLEL-B',
            label: 'Surveillance Target B',
            type: 'person',
            caseIds: ['CASE-2024-VORTEX'],
          },
        ],
        relationships: [
          {
            id: 'REL-BATCH-TEST-1',
            source: 'ENT-PARALLEL-A',
            target: 'ENT-PARALLEL-B',
            type: 'COMMUNICATED_WITH',
            confidence: 0.75,
            caseIds: ['CASE-2024-VORTEX'],
            metadata: { notes: 'Batch call 1' },
          },
          {
            id: 'REL-BATCH-TEST-2',
            source: 'ENT-PARALLEL-B',
            target: 'ENT-PARALLEL-A',
            type: 'COMMUNICATED_WITH', // Same undirected edge reversed
            confidence: 0.90,
            caseIds: ['CASE-2024-VORTEX'],
            metadata: { notes: 'Batch call 2' },
          },
        ],
      };

      const result = await ingestionService.ingest(payload);

      assert.strictEqual(result.summary.relationshipsMerged, 1, 'One parallel relationship should be merged in-flight');
      assert.strictEqual(result.summary.relationshipsCreated, 1);

      // Verify merged record has max confidence and occurrence count incremented
      const resolvedRel = store.getRelationship('REL-BATCH-TEST-1');
      assert.ok(resolvedRel);
      assert.strictEqual(resolvedRel.confidence, 0.90, 'Confidence must be upgraded to highest value');
      assert.strictEqual(resolvedRel.metadata.occurrenceCount, 2, 'Occurrence count must be 2');

      // Verify graph representation has no parallel edges
      const graph = store.getGraph({ caseId: 'CASE-2024-VORTEX' });
      const matchingEdges = graph.links.filter(l =>
        (l.source === 'ENT-PARALLEL-A' && l.target === 'ENT-PARALLEL-B') ||
        (l.source === 'ENT-PARALLEL-B' && l.target === 'ENT-PARALLEL-A')
      );
      assert.strictEqual(matchingEdges.length, 1, 'Graph must contain zero duplicate parallel edges');
    });

    it('merges incoming relationship into existing store record', async () => {
      // Find an existing relationship in VORTEX
      const existingRels = store.getRelationshipsByCase('CASE-2024-VORTEX');
      const targetRel = existingRels[0];
      const prevOccurrences = targetRel.metadata?.occurrenceCount || 1;

      const payload = {
        source: 'manual',
        caseId: 'CASE-2024-VORTEX',
        relationships: [
          {
            source: targetRel.source,
            target: targetRel.target,
            type: targetRel.type,
            confidence: 0.99,
            caseIds: targetRel.caseIds,
            evidenceIds: ['EVD-EXTERNAL-AUDIT-01'],
            metadata: { sourceLedger: 'Dubai Hawala Registry 2024' },
          },
        ],
      };

      const result = await ingestionService.ingest(payload);

      assert.strictEqual(result.summary.relationshipsMerged, 1, 'Must merge with existing relationship in store');
      const updatedRel = store.getRelationship(targetRel.id);
      assert.strictEqual(updatedRel.confidence, 0.99);
      assert.strictEqual(updatedRel.metadata.occurrenceCount, prevOccurrences + 1);
      assert.ok(updatedRel.evidenceIds.includes('EVD-EXTERNAL-AUDIT-01'));
    });
  });

  // ===========================================================================
  // 2. FILE -> EVIDENCE EXHIBIT INGESTION & HASHING
  // ===========================================================================
  describe('2. File -> Evidence Exhibit Ingestion & Integrity', () => {
    it('registers entire uploaded file as a custody evidence exhibit', async () => {
      const rawRows = [
        { Subject: 'Tariq Mansoor', Note: 'Interception transcript' },
      ];
      const mapping = {
        Subject: 'entity.label',
      };

      const payload = buildIngestionPayloadFromMapping({
        rows: rawRows,
        mapping,
        filename: 'intercept_transcript.pdf',
        fileHash: 'SHA256:abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        fileSize: 45200,
        registerSourceFileAsEvidence: true,
        defaultCaseId: 'CASE-2024-VORTEX',
      });

      assert.ok(payload.evidence.length >= 1, 'Should generate whole-file evidence exhibit');
      const fileExhibit = payload.evidence[0];
      assert.strictEqual(fileExhibit.evidenceType, 'FORENSIC_REPORT');
      assert.strictEqual(fileExhibit.fileHash, 'SHA256:abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
      assert.strictEqual(fileExhibit.classification, 'FACT');
      assert.ok(fileExhibit.chainOfCustody.length > 0);

      // Ingest the payload and check store
      const ingestResult = await ingestionService.ingest({
        ...payload,
        source: 'file',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.strictEqual(ingestResult.summary.evidenceCreated, 1);
      const storedExhibit = store.getEvidence(fileExhibit.id);
      assert.ok(storedExhibit);
      assert.strictEqual(storedExhibit.metadata.fileSize, 45200);
    });

    it('ingests row-level mapped evidence exhibits with entity linkage', async () => {
      const payload = {
        source: 'manual',
        caseId: 'CASE-2024-VORTEX',
        entities: [
          {
            id: 'PER-TEST-DEVICE-HOLDER',
            label: 'Suspect Under Surveillance',
            type: 'person',
            caseIds: ['CASE-2024-VORTEX'],
          },
        ],
        evidence: [
          {
            id: 'EVD-ROW-EXHIBIT-99',
            title: 'Seized Encrypted USB',
            evidenceType: 'SEIZED_DEVICE',
            classification: 'FACT',
            caseIds: ['CASE-2024-VORTEX'],
            entityIds: ['PER-TEST-DEVICE-HOLDER'],
            chainOfCustody: [
              {
                action: 'SEIZED',
                timestamp: '2024-03-10T14:30:00Z',
                actor: 'Inspector V. Saxena',
                location: 'Mumbai Port Gate 4',
              },
            ],
          },
        ],
      };

      const res = await ingestionService.ingest(payload);
      assert.strictEqual(res.summary.evidenceCreated, 1);

      const stored = store.getEvidence('EVD-ROW-EXHIBIT-99');
      assert.ok(stored);
      assert.strictEqual(stored.title, 'Seized Encrypted USB');
      assert.ok(stored.entityIds.includes('PER-TEST-DEVICE-HOLDER'));
    });
  });

  // ===========================================================================
  // 3. DYNAMIC GEOSPATIAL TRANSIT CORRIDORS
  // ===========================================================================
  describe('3. Dynamic Geospatial Transit Arcs', () => {
    it('derives dynamic transit arcs from active case locations and relationships', () => {
      const locations = store.getLocationsByCase('CASE-2024-VORTEX');
      assert.ok(locations.length >= 5);

      const arcs = buildDynamicTransitArcs({
        locations,
        caseId: 'CASE-2024-VORTEX',
      });

      assert.ok(Array.isArray(arcs));
      assert.ok(arcs.length > 0, 'Should generate dynamic inter-city arcs for VORTEX');

      // Verify arc structure
      const firstArc = arcs[0];
      assert.ok(firstArc.fromCity);
      assert.ok(firstArc.toCity);
      assert.strictEqual(typeof firstArc.fromLat, 'number');
      assert.strictEqual(typeof firstArc.fromLng, 'number');
      assert.strictEqual(typeof firstArc.toLat, 'number');
      assert.strictEqual(typeof firstArc.toLng, 'number');
      assert.ok(firstArc.type);
      assert.ok(firstArc.color);
    });

    it('returns empty arcs array when case has no cross-city linkages', () => {
      store.addCase({
        id: 'CASE-ISOLATED',
        title: 'Isolated Local Case',
        description: 'No movements or cross-city links',
        status: 'ACTIVE',
        priority: 'LOW',
      });

      const arcs = buildDynamicTransitArcs({
        locations: [],
        caseId: 'CASE-ISOLATED',
      });

      assert.deepStrictEqual(arcs, [], 'Arcs must be empty array for case with no geo links');
    });

    it('filters transit corridors by entityId when specified', () => {
      const locations = store.getLocationsByCase('CASE-2024-VORTEX');
      const arcsForMunshi = buildDynamicTransitArcs({
        locations,
        caseId: 'CASE-2024-VORTEX',
        entityId: 'PER-MUNSHI-02',
      });

      assert.ok(Array.isArray(arcsForMunshi));
      arcsForMunshi.forEach(arc => {
        assert.ok(
          arc.entitiesInvolved.includes('PER-MUNSHI-02') || arc.entitiesInvolved.some(e => e.includes('Munshi')),
          'Filtered arcs must involve the specified entity'
        );
      });
    });
  });

  // ===========================================================================
  // 4. DYNAMIC MORIARTY ADVERSARIAL ENGINE
  // ===========================================================================
  describe('4. Dynamic Moriarty Adversarial Engine', () => {
    it('generates case-grounded adversarial assessments with strict classifications', () => {
      const assessmentsResult = MoriartyEngine.generateAssessments({
        caseId: 'CASE-2024-VORTEX',
      });

      assert.strictEqual(assessmentsResult.caseId, 'CASE-2024-VORTEX');
      assert.ok(assessmentsResult.adversarialAssessments.length >= 3);

      assessmentsResult.adversarialAssessments.forEach(assessment => {
        assert.ok(assessment.id.startsWith('MORIARTY-HYP-'));
        assert.ok(assessment.title);
        assert.ok(assessment.claimChallenged);
        assert.ok(Array.isArray(assessment.facts), 'Must have explicit facts array');
        assert.ok(Array.isArray(assessment.computed), 'Must have explicit computed array');
        assert.ok(assessment.counterHypothesis, 'Must formulate counter-hypothesis');
        assert.ok(assessment.recommendedVerification, 'Must have recommended verification steps');
        assert.strictEqual(assessment.classification, 'HYPOTHESIS');
      });
    });

    it('enforces strict dataset isolation and does NOT leak VORTEX entities into another case', () => {
      store.addCase({
        id: 'CASE-CYBER-PUNJAB',
        title: 'Operation Punjab Phishing Ring',
        description: 'Independent cyber investigation',
        status: 'ACTIVE',
        priority: 'MEDIUM',
      });

      store.addEntity({
        id: 'PER-CYBER-01',
        label: 'Harpreet Singh',
        type: 'person',
        caseIds: ['CASE-CYBER-PUNJAB'],
        attributes: { phoneNumber: '+919811002233' },
      });

      store.addEntity({
        id: 'PER-CYBER-02',
        label: 'Gurinder Gill',
        type: 'person',
        caseIds: ['CASE-CYBER-PUNJAB'],
        attributes: { phoneNumber: '+919811002233' }, // Shared phone anomaly
      });

      store.addRelationship({
        id: 'REL-CYBER-01',
        source: 'PER-CYBER-01',
        target: 'PER-CYBER-02',
        type: 'CONNECTED_TO',
        confidence: 0.8,
        caseIds: ['CASE-CYBER-PUNJAB'],
      });

      const assessment = MoriartyEngine.generateAssessments({
        caseId: 'CASE-CYBER-PUNJAB',
      });

      assert.strictEqual(assessment.caseId, 'CASE-CYBER-PUNJAB');
      const allText = JSON.stringify(assessment);
      // Ensure zero leakage of VORTEX entities
      assert.ok(!allText.includes('Tariq Mansoor'), 'Must not leak Tariq Mansoor');
      assert.ok(!allText.includes('Operation VORTEX'), 'Must not leak Operation VORTEX');
      assert.ok(!allText.includes('Karan "Munshi" Verma'), 'Must not leak Munshi');

      // Must detect the actual planted anomaly in CASE-CYBER-PUNJAB
      assert.ok(allText.includes('Harpreet Singh'));
      assert.ok(allText.includes('Gurinder Gill'));
    });
  });

  // ===========================================================================
  // 5. SHERLOCK QUERY EXPANSION
  // ===========================================================================
  describe('5. Sherlock Query Expansion & Graph Reasoning', () => {
    it('executes BFS shortest path query expansion between two network entities', async () => {
      const response = await AIService.querySherlock({
        query: 'What is the shortest path between Tariq Mansoor and Karan Munshi Verma?',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.ok(response.answer.includes('Shortest Path Analysis'));
      assert.ok(response.answer.includes('hop(s)'));
      assert.strictEqual(response.supportingData.classification, 'ANALYTICAL_RESULT');
      assert.ok(response.supportingData.entities.length >= 2);
    });

    it('resolves live hardware IMEI queries accurately to linked devices', async () => {
      const response = await AIService.querySherlock({
        query: 'Look up hardware device with IMEI 86420904011234',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.ok(response.answer.includes('86420904011234'));
      assert.ok(response.supportingData.entities.length >= 2, 'Must locate both devices sharing this IMEI');
      assert.strictEqual(response.supportingData.classification, 'FACT');
    });

    it('filters timeline incidents when query specifies an ISO date', async () => {
      const response = await AIService.querySherlock({
        query: 'What events occurred on 2024-03-15?',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.ok(response.answer.includes('Timeline Events on 2024-03-15'));
      assert.ok(response.supportingData.events.length > 0);
      response.supportingData.events.forEach(ev => {
        assert.ok(ev.timestamp.startsWith('2024-03-15'));
      });
    });
  });
});
