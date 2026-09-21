import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { runSeed } from '../src/data/seed/index.js';
import { AnalyticsService } from '../src/services/analyticsService.js';
import { AIService } from '../src/services/aiService.js';
import { store } from '../src/data/store.js';

describe('API Services & Analytical Integrity', () => {
  before(() => {
    runSeed();
  });

  test('Cases: retrieves cases with analytical metrics', () => {
    const cases = store.getAllCases();
    assert.ok(cases.length >= 3);
    const primary = store.getCase('CASE-2024-VORTEX');
    assert.equal(primary.id, 'CASE-2024-VORTEX');
    assert.equal(primary.priority, 'CRITICAL');
  });

  test('Search: finds entities by name, alias, and attributes', () => {
    const sultanResults = store.search('Sultan');
    assert.ok(sultanResults.length > 0);
    assert.equal(sultanResults[0].id, 'PER-SULTAN-01');

    const bladeResults = store.search('Blade');
    assert.ok(bladeResults.length > 0);
    assert.equal(bladeResults[0].id, 'PER-BLADE-03');

    const imeiResults = store.search('86420904011234');
    assert.ok(imeiResults.length >= 2, 'Should find both devices sharing the burner IMEI');
  });

  test('Graph: retrieves filtered subgraph and node expansions', () => {
    const fullGraph = store.getGraph({ caseId: 'CASE-2024-VORTEX' });
    assert.ok(fullGraph.nodes.length > 10);
    assert.ok(fullGraph.links.length > 10);

    const expansion = store.getGraph({ entityId: 'PER-MUNSHI-02', depth: 1 });
    assert.ok(expansion.nodes.length >= 4);
    assert.ok(expansion.links.length >= 4);
  });

  test('Analytics: calculates degree, betweenness, and identifies Munshi as bridge', () => {
    const results = AnalyticsService.runFullAnalytics('CASE-2024-VORTEX');

    assert.ok(results.summary.totalNodes > 0);
    assert.ok(results.summary.networkDensity > 0);
    assert.ok(results.centrality.degree.length > 0);
    assert.ok(results.centrality.betweenness.length > 0);

    // Verify top betweenness candidate is Munshi
    const topBetweenness = results.centrality.betweenness[0];
    assert.equal(topBetweenness.entity.id, 'PER-MUNSHI-02', 'Karan Munshi Verma must be the top betweenness connector');

    // Verify bridge candidates
    assert.ok(results.bridgeCandidates.some(b => b.entity.id === 'PER-MUNSHI-02'));
  });

  test('Shortest Path: finds path between Sultan (Kingpin) and Driver (Transporter)', () => {
    const path = AnalyticsService.findShortestPath('PER-SULTAN-01', 'PER-DRIVER-06', 'CASE-2024-VORTEX');
    assert.ok(path);
    assert.ok(path.distance >= 2, 'Path should traverse via Munshi and Blade');
    
    // Path should be Sultan -> Munshi -> Blade -> Driver
    const nodeIds = path.nodes.map(n => n.id);
    assert.equal(nodeIds[0], 'PER-SULTAN-01');
    assert.ok(nodeIds.includes('PER-MUNSHI-02'));
    assert.ok(nodeIds.includes('PER-BLADE-03'));
    assert.equal(nodeIds[nodeIds.length - 1], 'PER-DRIVER-06');
  });

  test('Timeline: returns events with chronological sorting and entity filtering', () => {
    const allEvents = store.getAllEvents();
    assert.ok(allEvents.length >= 5);

    const bladeEvents = store.getEventsByEntity('PER-BLADE-03');
    assert.ok(bladeEvents.length >= 3);
  });

  test('Geospatial: delivers Indian and international coordinates', () => {
    const locs = store.getAllLocations();
    const cities = locs.map(l => l.city);
    assert.ok(cities.includes('New Delhi'));
    assert.ok(cities.includes('Mumbai'));
    assert.ok(cities.includes('Dubai'));
  });

  test('AI Sherlock: answers connection queries with structured evidence', async () => {
    const res = await AIService.querySherlock({
      query: 'What connections are around Munshi?',
      caseId: 'CASE-2024-VORTEX',
      selectedEntityId: 'PER-MUNSHI-02',
    });

    assert.ok(res.answer.includes('Karan "Munshi" Verma'));
    assert.ok(res.supportingData.relationships.length >= 3);
    assert.equal(res.supportingData.classification, 'FACT');
  });

  test('AI Sherlock: identifies bridge nodes correctly', async () => {
    const res = await AIService.querySherlock({
      query: 'What entities connect these two groups or act as a bridge?',
      caseId: 'CASE-2024-VORTEX',
    });

    assert.ok(res.answer.includes('Karan "Munshi" Verma'));
    assert.equal(res.supportingData.classification, 'ANALYTICAL_RESULT');
  });

  test('AI Moriarty: generates adversarial assessments with counter-hypotheses', async () => {
    const res = await AIService.queryMoriarty({
      caseId: 'CASE-2024-VORTEX',
      selectedEntityId: 'PER-MUNSHI-02',
    });

    assert.ok(res.adversarialAssessments.length >= 2);
    assert.ok(res.adversarialAssessments[0].counterHypothesis);
    assert.ok(res.adversarialAssessments[0].weaknessesInProsecution);
  });
});
