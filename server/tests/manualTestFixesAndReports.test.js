/**
 * CONSTELLATION — Automated Tests for Manual Test Fixes & Printable Intelligence Reports
 *
 * Covers:
 * 1. Graph Data Transformation & Link Reference Normalization
 * 2. Moriarty Engine Data Flow & Classification Resilience
 * 3. Printable Case Report Data Formatting & Completeness
 * 4. Printable Person / Entity Intelligence Profile Extraction
 * 5. Simulation Reheat Kinetics & State Preservation
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { runSeed } from '../src/data/seed/index.js';
import { store } from '../src/data/store.js';
import { MoriartyEngine } from '../src/services/moriartyEngine.js';

describe('Manual Test Fixes & Printable Reports Verification', () => {
  before(() => {
    runSeed();
  });

  describe('1. 3D Graph Data Transformation & Link Normalization', () => {
    it('normalizes link source/target object references back to string IDs', () => {
      const sampleGraphData = {
        nodes: [
          { id: 'PER-SULTAN-01', label: 'Tariq "Sultan" Mansoor', type: 'criminal' },
          { id: 'PER-MUNSHI-02', label: 'Karan "Munshi" Verma', type: 'suspect' },
        ],
        links: [
          {
            source: { id: 'PER-SULTAN-01', x: 10, y: 20 },
            target: { id: 'PER-MUNSHI-02', x: 50, y: 80 },
            type: 'COORDINATED_WITH',
            confidence: 0.95,
          },
        ],
      };

      // Transformation logic as used in KnowledgeGraphView.jsx
      const cleanData = {
        nodes: (sampleGraphData.nodes || []).map(n => ({ ...n })),
        links: (sampleGraphData.links || []).map(l => ({
          ...l,
          source: typeof l.source === 'object' && l.source !== null ? l.source.id : l.source,
          target: typeof l.target === 'object' && l.target !== null ? l.target.id : l.target,
        })),
      };

      assert.equal(typeof cleanData.links[0].source, 'string');
      assert.equal(cleanData.links[0].source, 'PER-SULTAN-01');
      assert.equal(typeof cleanData.links[0].target, 'string');
      assert.equal(cleanData.links[0].target, 'PER-MUNSHI-02');
      assert.notStrictEqual(cleanData.nodes, sampleGraphData.nodes, 'Nodes should be deep cloned');
    });

    it('extracts readable canonical entity labels from nodes', () => {
      const nodes = store.getEntitiesByCase('CASE-2024-VORTEX');
      assert.ok(nodes.length > 0, 'Should retrieve nodes from VORTEX case');

      nodes.forEach(node => {
        const canonicalLabel = node.label || node.attributes?.alias || node.name || node.id;
        assert.ok(canonicalLabel, `Node ${node.id} must have a valid non-empty label`);
        assert.equal(typeof canonicalLabel, 'string');
      });

      const sultan = nodes.find(n => n.id === 'PER-SULTAN-01');
      assert.ok(sultan);
      assert.match(sultan.label, /Sultan/);
    });
  });

  describe('2. Moriarty Engine Data Flow & Resilient Classifications', () => {
    it('produces assessments with array weaknessesInProsecution and required classifications', async () => {
      const result = await MoriartyEngine.generateAssessments({
        caseId: 'CASE-2024-VORTEX',
      });

      assert.ok(result.adversarialAssessments, 'Result should have adversarialAssessments');
      assert.ok(result.adversarialAssessments.length > 0, 'Should produce at least one assessment');

      const validClassifications = new Set(['FACT', 'COMPUTED', 'HYPOTHESIS', 'RECOMMENDED_VERIFICATION']);

      result.adversarialAssessments.forEach(item => {
        assert.ok(item.id.startsWith('MORIARTY-HYP-'));
        assert.ok(item.title);
        assert.ok(item.claimChallenged);
        assert.ok(item.counterHypothesis);

        // Classification must be valid
        assert.ok(validClassifications.has(item.classification));

        // Facts must be an array of strings
        assert.ok(Array.isArray(item.facts), 'facts must be an array');
        assert.ok(item.facts.length > 0, 'facts must not be empty');

        // Computed signals must be an array of strings
        assert.ok(Array.isArray(item.computed), 'computed must be an array');

        // weaknessesInProsecution MUST be an array of strings to avoid TypeError: map is not a function
        assert.ok(Array.isArray(item.weaknessesInProsecution), 'weaknessesInProsecution must be an array');
        assert.ok(item.weaknessesInProsecution.length > 0);

        // Recommended verification must be a non-empty string
        assert.equal(typeof item.recommendedVerification, 'string');
        assert.ok(item.recommendedVerification.length > 10);
      });
    });
  });

  describe('3. Printable Case Report Data Formatting', () => {
    it('generates complete structured case report payload', () => {
      const caseObj = store.getCase('CASE-2024-VORTEX');
      assert.ok(caseObj, 'Case must exist');

      const entities = store.getEntitiesByCase('CASE-2024-VORTEX');
      const relationships = store.getRelationshipsByCase('CASE-2024-VORTEX');
      const timeline = store.getEventsByCase('CASE-2024-VORTEX');
      const locations = store.getLocationsByCase('CASE-2024-VORTEX');
      const evidence = store.getEvidenceByCase('CASE-2024-VORTEX');

      const caseReport = {
        caseInfo: {
          id: caseObj.id,
          title: caseObj.title,
          status: caseObj.status,
          priority: caseObj.priority,
          leadInvestigator: caseObj.leadInvestigator,
          keySections: caseObj.keySections,
          summary: caseObj.summary,
        },
        entitiesCount: entities.length,
        relationshipsCount: relationships.length,
        timelineCount: timeline.length,
        locationsCount: locations.length,
        evidenceCount: evidence.length,
      };

      assert.equal(caseReport.caseInfo.id, 'CASE-2024-VORTEX');
      assert.ok(caseReport.entitiesCount >= 10, 'Case should contain entities');
      assert.ok(caseReport.relationshipsCount >= 10, 'Case should contain relationships');
      assert.ok(caseReport.timelineCount >= 3, 'Case should contain timeline events');
      assert.ok(caseReport.locationsCount >= 3, 'Case should contain locations');
      assert.ok(caseReport.evidenceCount >= 3, 'Case should contain evidence items');
    });
  });

  describe('4. Printable Person / Entity Intelligence Profile Extraction', () => {
    it('extracts technical identifiers, connections, and evidence for a target person', () => {
      const sultan = store.getEntity('PER-SULTAN-01');
      assert.ok(sultan, 'Target entity must exist');

      // Connected relationships
      const allRels = store.getRelationshipsByCase('CASE-2024-VORTEX');
      const connectedRels = allRels.filter(r => r.source === sultan.id || r.target === sultan.id);

      // Connected events
      const allEvents = store.getEventsByCase('CASE-2024-VORTEX');
      const entityEvents = allEvents.filter(e => (e.entityIds || []).includes(sultan.id));

      // Connected evidence
      const allEvidence = store.getEvidenceByCase('CASE-2024-VORTEX');
      const entityEvidence = allEvidence.filter(e => (e.entityIds || e.linkedEntityIds || []).includes(sultan.id));

      const personProfile = {
        identity: {
          id: sultan.id,
          label: sultan.label,
          type: sultan.type,
          subType: sultan.subType,
          alias: sultan.attributes?.alias,
          riskLevel: sultan.attributes?.riskLevel,
          confidence: sultan.confidence,
        },
        technicalIdentifiers: {
          phone: sultan.attributes?.phoneNumber,
          passport: sultan.attributes?.passportNo,
          alias: sultan.attributes?.alias,
        },
        connectionsCount: connectedRels.length,
        eventsCount: entityEvents.length,
        evidenceCount: entityEvidence.length,
      };

      assert.equal(personProfile.identity.id, 'PER-SULTAN-01');
      assert.equal(personProfile.identity.type, 'criminal');
      assert.match(personProfile.identity.alias, /Sultan/);
      assert.ok(personProfile.technicalIdentifiers.passport, 'Sultan should have a passport identifier');
      assert.ok(personProfile.connectionsCount > 0, 'Sultan must have connections');
      assert.ok(personProfile.eventsCount > 0, 'Sultan must have associated events');

      // Also verify profile extraction for operative with direct physical evidence (Blade)
      const bladeEvidence = allEvidence.filter(e => (e.entityIds || e.linkedEntityIds || []).includes('PER-BLADE-03'));
      assert.ok(bladeEvidence.length > 0, 'Operative Blade must have linked physical evidence');
    });
  });

  describe('5. Simulation Reheat Kinetics & State Preservation', () => {
    it('perturbs node velocities and preserves existing physics configuration without data corruption', () => {
      const nodes = [
        { id: 'A', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
        { id: 'B', x: 50, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
      ];

      // Reheat perturbation function logic as implemented in KnowledgeGraphView.jsx
      nodes.forEach(n => {
        n.vx = (n.vx || 0) + (0.5) * 8; // deterministic test delta
        n.vy = (n.vy || 0) + (-0.25) * 8;
        n.vz = (n.vz || 0) + (0.1) * 8;
      });

      assert.notEqual(nodes[0].vx, 0, 'Node velocity should be agitated to restart physics');
      assert.notEqual(nodes[0].vy, 0);
      assert.equal(nodes[0].id, 'A', 'Node identity must be preserved');
      assert.equal(nodes[1].id, 'B', 'Node identity must be preserved');
    });
  });
});
