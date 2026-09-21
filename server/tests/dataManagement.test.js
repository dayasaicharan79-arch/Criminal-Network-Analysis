/**
 * CONSTELLATION — Synthetic Intelligence & Data Management Test Suite
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/data/store.js';
import { runSeed } from '../src/data/seed/index.js';
import {
  syntheticGeneratorService,
  SCENARIO_DEFINITIONS,
  PRESET_CONFIGS,
} from '../src/services/syntheticGeneratorService.js';
import { ingestionService } from '../src/services/ingestionService.js';

describe('Data Management & Synthetic Scenarios Pipeline', () => {
  beforeEach(() => {
    runSeed();
  });

  describe('Synthetic Scenario Definitions & Presets', () => {
    it('defines all 6 canonical investigation scenarios', () => {
      const required = ['SCENARIO_A', 'SCENARIO_B', 'SCENARIO_C', 'SCENARIO_D', 'SCENARIO_E', 'SCENARIO_F'];
      for (const id of required) {
        assert.ok(SCENARIO_DEFINITIONS[id], `Scenario ${id} must be defined`);
        assert.ok(SCENARIO_DEFINITIONS[id].name);
        assert.ok(SCENARIO_DEFINITIONS[id].description);
      }
    });

    it('defines all standard scale presets', () => {
      const requiredPresets = ['SMALL', 'MEDIUM', 'LARGE', 'STRESS_TEST'];
      for (const p of requiredPresets) {
        assert.ok(PRESET_CONFIGS[p], `Preset ${p} must be defined`);
        assert.ok(PRESET_CONFIGS[p].entities > 0);
      }
    });
  });

  describe('Synthetic Dataset Generator Scenarios', () => {
    it('generates Scenario A (Organized Syndicate) with Kingpin and Bridge entities', () => {
      const dataset = syntheticGeneratorService.generateDataset({
        scenario: 'SCENARIO_A',
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(dataset.scenario, 'SCENARIO_A');
      assert.ok(dataset.entities.length >= 15);
      assert.ok(dataset.relationships.length >= 10);
      assert.ok(dataset.locations.length >= 4);

      // Verify Kingpin and Bridge nodes exist
      const kingpin = dataset.entities.find(e => e.subType === 'Syndicate Kingpin');
      const bridge = dataset.entities.find(e => e.subType.includes('Bridge'));
      assert.ok(kingpin, 'Must contain a Kingpin');
      assert.ok(bridge, 'Must contain a Bridge entity');
      assert.equal(kingpin.source, 'SYNTHETIC / DEMONSTRATION DATA');
    });

    it('generates Scenario B (Communication Network) with burner phones and shared IMEI anomaly', () => {
      const dataset = syntheticGeneratorService.generateDataset({
        scenario: 'SCENARIO_B',
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(dataset.scenario, 'SCENARIO_B');
      const phones = dataset.entities.filter(e => e.type === 'phone');
      assert.ok(phones.length >= 2, 'Communication scenario must contain multiple phones');

      // Check for phone attributes
      for (const p of phones) {
        assert.ok(p.attributes.phoneNumber);
      }
    });

    it('generates Scenario C (Multi-Location Investigation) with coordinates and addresses', () => {
      const dataset = syntheticGeneratorService.generateDataset({
        scenario: 'SCENARIO_C',
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(dataset.scenario, 'SCENARIO_C');
      assert.ok(dataset.locations.length >= 4);

      for (const loc of dataset.locations) {
        assert.ok(typeof loc.latitude === 'number' && loc.latitude >= -90 && loc.latitude <= 90);
        assert.ok(typeof loc.longitude === 'number' && loc.longitude >= -180 && loc.longitude <= 180);
        assert.ok(loc.city);
      }
    });

    it('generates Scenario D (Transaction Network) with financial entities', () => {
      const dataset = syntheticGeneratorService.generateDataset({
        scenario: 'SCENARIO_D',
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(dataset.scenario, 'SCENARIO_D');
      const financialOrgsOrTrx = dataset.entities.filter(e => e.type === 'transaction' || e.type === 'organization');
      assert.ok(financialOrgsOrTrx.length >= 2, 'Transaction scenario must contain financial nodes');
    });

    it('generates Scenario E (Cross-Case Investigation) linking multiple cases', () => {
      const dataset = syntheticGeneratorService.generateDataset({
        scenario: 'SCENARIO_E',
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(dataset.scenario, 'SCENARIO_E');
      assert.ok(dataset.activeCaseIds.length >= 2, 'Cross-case scenario must have multiple cases');
      const sharedEntities = dataset.entities.filter(e => e.caseIds.length > 1);
      assert.ok(sharedEntities.length > 0, 'Must have entities linked to multiple cases');
    });

    it('generates Scenario F (Large Network Stress Test) with safe bounded scale', () => {
      const dataset = syntheticGeneratorService.generateDataset({
        scenario: 'SCENARIO_F',
        entityCount: 60,
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(dataset.scenario, 'SCENARIO_F');
      assert.equal(dataset.entities.length, 60);
      assert.ok(dataset.relationships.length >= 40);
    });
  });

  describe('Synthetic Ingestion Integration', () => {
    it('pipes generated synthetic data through canonical ingestion pipeline into store', async () => {
      const initialEntityCount = store.getAllEntities().length;

      const result = await syntheticGeneratorService.generateAndIngest({
        scenario: 'SCENARIO_A',
        preset: 'SMALL',
        caseId: 'CASE-2024-VORTEX',
      });

      assert.equal(result.success, true);
      assert.ok(result.batchId);
      assert.ok(result.summary.accepted > 0);
      assert.equal(result.summary.rejected, 0);

      // Verify store updated
      const newEntityCount = store.getAllEntities().length;
      assert.ok(newEntityCount > initialEntityCount, 'Entities must be committed to DataStore');

      // Verify ingestion history logged
      const history = store.getIngestionHistory({ limit: 5 });
      const batchRecord = history.find(b => b.batchId === result.batchId);
      assert.ok(batchRecord);
      assert.equal(batchRecord.source, 'synthetic');
      assert.equal(batchRecord.metadata.scenario, 'SCENARIO_A');
    });
  });
});
