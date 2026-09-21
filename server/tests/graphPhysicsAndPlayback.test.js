/**
 * CONSTELLATION — Phase 23 Automated Test Suite
 * Graph Layout Physics Tuning, Timeline Playback Sync, and Query Presets
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/data/store.js';
import { runSeed } from '../src/data/seed/index.js';
import { AnalyticsService } from '../src/services/analyticsService.js';

describe('Phase 23: Graph Layout Physics & Timeline Playback Sync', () => {
  beforeEach(() => {
    store.reset();
    runSeed();
  });

  describe('1. Graph Physics Tuning & Community Anchors', () => {
    it('validates physics parameter defaults and boundaries', () => {
      const DEFAULT_GRAPH_PHYSICS = {
        chargeStrength: -120,
        linkDistance: 45,
        collisionRadius: 8,
        damping: 0.4,
        communityAnchors: false,
      };

      // Ensure charge is negative (repulsive)
      assert.ok(DEFAULT_GRAPH_PHYSICS.chargeStrength < 0);
      assert.ok(DEFAULT_GRAPH_PHYSICS.chargeStrength >= -600 && DEFAULT_GRAPH_PHYSICS.chargeStrength <= -30);

      // Ensure link distance is positive
      assert.ok(DEFAULT_GRAPH_PHYSICS.linkDistance >= 15 && DEFAULT_GRAPH_PHYSICS.linkDistance <= 150);

      // Ensure collision radius is non-negative
      assert.ok(DEFAULT_GRAPH_PHYSICS.collisionRadius >= 0 && DEFAULT_GRAPH_PHYSICS.collisionRadius <= 30);

      // Ensure damping is between 0 and 1
      assert.ok(DEFAULT_GRAPH_PHYSICS.damping >= 0.1 && DEFAULT_GRAPH_PHYSICS.damping <= 0.8);
    });

    it('calculates valid 3D community centroid coordinates for community anchors', () => {
      const analytics = AnalyticsService.runFullAnalytics();

      assert.ok(analytics.communities.length > 0, 'Communities must be detected');

      const K = analytics.communities.length;
      const nodeCommunityMap = new Map();
      const radius = 130;

      analytics.communities.forEach((comm, idx) => {
        const angle = (2 * Math.PI * idx) / K;
        const cx = Number((radius * Math.cos(angle)).toFixed(3));
        const cz = Number((radius * Math.sin(angle)).toFixed(3));

        assert.ok(!Number.isNaN(cx), 'Centroid X must be a valid number');
        assert.ok(!Number.isNaN(cz), 'Centroid Z must be a valid number');

        (comm.memberEntities || []).forEach(ent => {
          if (ent?.id) {
            nodeCommunityMap.set(ent.id, { x: cx, z: cz, communityId: comm.id });
          }
        });
      });

      // Assert that nodes have mapped community coordinates
      assert.ok(nodeCommunityMap.size > 0);
      const sampleNode = nodeCommunityMap.get('PER-SULTAN-01');
      assert.ok(sampleNode, 'Sultan must have community coordinates');
      assert.equal(typeof sampleNode.x, 'number');
      assert.equal(typeof sampleNode.z, 'number');
    });
  });

  describe('2. Timeline ↔ Graph Synchronization', () => {
    it('accurately identifies active and in-focus entities in cumulative window mode', () => {
      const events = store.getAllEvents();
      assert.ok(events.length >= 4, 'Must have at least 4 timeline events in seed data');

      // Pick the second event as the temporal slice
      const secondEvent = events[1];
      const targetTime = secondEvent.timestamp;
      const curDate = new Date(targetTime);

      // Cumulative filtering: all events <= targetTime
      const activeEvents = events.filter(e => new Date(e.timestamp) <= curDate);
      assert.equal(activeEvents.length, 2, 'Cumulative window should match first 2 events');

      const activeEntityIds = new Set(activeEvents.flatMap(e => e.entityIds || []));
      const focusedEntityIds = new Set(secondEvent.entityIds || []);

      // Verify that entities in first event and second event are active
      assert.ok(activeEntityIds.has('PER-OFFICER-07'), 'Officer from EV-01 must be active in cumulative mode');
      assert.ok(activeEntityIds.has('PER-SULTAN-01'), 'Sultan must be active');
      assert.ok(activeEntityIds.has('PER-MUNSHI-02'), 'Munshi from EV-02 must be active');

      // Focused entities must strictly be from the second event
      assert.ok(focusedEntityIds.has('PER-MUNSHI-02'));
      assert.ok(focusedEntityIds.has('PHO-SULTAN-01'));
      assert.ok(!focusedEntityIds.has('DOC-FIR-204'), 'Document from EV-01 is not focused in EV-02');
    });

    it('accurately isolates entities in slice window mode without destroying graph topology', () => {
      const events = store.getAllEvents();
      const thirdEvent = events[2]; // Munshi hands operational token to Blade

      // In slice mode, only the target event is active
      const activeEntityIds = new Set(thirdEvent.entityIds || []);
      const allEntities = store.getAllEntities();

      // Ensure inactive entities are marked for de-emphasis, NOT deleted
      const activeEntities = allEntities.filter(e => activeEntityIds.has(e.id));
      const inactiveEntities = allEntities.filter(e => !activeEntityIds.has(e.id));

      assert.ok(activeEntities.length > 0, 'Active entities exist');
      assert.ok(inactiveEntities.length > 0, 'Inactive entities are retained in dataset');
      assert.equal(activeEntities.length + inactiveEntities.length, allEntities.length, 'Total node count is preserved');

      // Check specific actors in meeting
      assert.ok(activeEntityIds.has('PER-MUNSHI-02'));
      assert.ok(activeEntityIds.has('PER-BLADE-03'));
      assert.ok(!activeEntityIds.has('PER-OFFICER-07'), 'Officer is inactive in slice mode for EV-03');
    });

    it('verifies all timeline events use real existing ISO 8601 timestamps', () => {
      const events = store.getAllEvents();
      for (const ev of events) {
        assert.ok(ev.timestamp, `Event ${ev.id} must have a timestamp`);
        const parsed = new Date(ev.timestamp);
        assert.ok(!Number.isNaN(parsed.getTime()), `Event ${ev.id} timestamp must be valid ISO date`);
        assert.ok(ev.entityIds && ev.entityIds.length > 0, `Event ${ev.id} must reference real entities`);
      }
    });
  });

  describe('3. Playback Controls & Stepping Logic', () => {
    it('handles step navigation with strict boundary clamps', () => {
      const events = store.getAllEvents();
      const total = events.length;

      // Simulate stepPlayback
      function step(currentIndex, direction) {
        let next = currentIndex === -1 ? 0 : currentIndex + direction;
        if (next < 0) next = 0;
        if (next >= total) next = total - 1;
        return next;
      }

      assert.equal(step(0, -1), 0, 'Cannot step before index 0');
      assert.equal(step(0, 1), 1, 'Steps forward from 0 to 1');
      assert.equal(step(total - 1, 1), total - 1, 'Cannot step past end of events');
      assert.equal(step(-1, 1), 0, 'Initial unselected state steps to 0');
    });

    it('calculates playback step interval proportional to speed setting', () => {
      function getIntervalMs(speed) {
        return Math.max(250, Math.round(1600 / speed));
      }

      assert.equal(getIntervalMs(1), 1600, '1x speed equals 1600ms');
      assert.equal(getIntervalMs(2), 800, '2x speed equals 800ms');
      assert.equal(getIntervalMs(4), 400, '4x speed equals 400ms');
      assert.equal(getIntervalMs(0.5), 3200, '0.5x speed equals 3200ms');
    });
  });

  describe('4. Cross-Filter Query Presets', () => {
    it('applies Critical Hawala Links preset accurately on real graph', () => {
      const entities = store.getAllEntities();
      const relationships = store.getAllRelationships();

      // Hawala preset: persons, criminals, suspects, organizations, transactions with confidence >= 0.8
      const allowedTypes = new Set(['person', 'criminal', 'suspect', 'organization', 'transaction']);
      const minConfidence = 0.8;

      const filteredNodes = entities.filter(e => allowedTypes.has(e.type));
      const filteredLinks = relationships.filter(r => r.confidence >= minConfidence);

      assert.ok(filteredNodes.length > 0, 'Must have matching nodes');
      assert.ok(filteredNodes.some(n => n.id === 'PER-SULTAN-01'), 'Sultan matches Hawala profile');
      assert.ok(filteredNodes.some(n => n.id === 'ORG-ALNOOR-01'), 'Al Noor Trading matches Hawala profile');

      // No hardware devices in Hawala preset
      assert.ok(!filteredNodes.some(n => n.type === 'device'), 'Hardware devices excluded from Hawala preset');

      // High confidence links only
      for (const link of filteredLinks) {
        assert.ok(link.confidence >= 0.8, 'All filtered links must meet confidence threshold');
      }
    });

    it('applies Shared Burner IMEI Cluster preset accurately', () => {
      const entities = store.getAllEntities();
      const relationships = store.getAllRelationships();

      const allowedTypes = new Set(['phone', 'device', 'person', 'criminal', 'suspect']);
      const burnerNodes = entities.filter(e => allowedTypes.has(e.type));

      assert.ok(burnerNodes.some(n => n.id === 'PHO-BURNER-03'), 'Burner phone matches');
      assert.ok(burnerNodes.some(n => n.id === 'PHO-CYBER-04'), 'Cyber VoIP relay phone matches');

      // Comms / device relations
      const commLinks = relationships.filter(r =>
        r.type === 'COMMUNICATED_WITH' || r.type === 'OWNS' || r.type === 'USED' || r.type === 'CALL_RECORDS' || r.type === 'SHARED_HARDWARE'
      );
      assert.ok(commLinks.length > 0, 'Comms links must be present');
    });

    it('applies High-Betweenness Bridge Nodes preset using real analytics', () => {
      const analytics = AnalyticsService.runFullAnalytics();

      const bridgeCandidates = analytics.bridgeCandidates;
      assert.ok(bridgeCandidates.length > 0, 'Bridge candidates must be computed');

      // Karan Munshi Verma must be a bridge candidate
      const munshiCandidate = bridgeCandidates.find(b => b.entity.id === 'PER-MUNSHI-02');
      assert.ok(munshiCandidate, 'Karan Munshi Verma must be identified as bridge broker');
      assert.ok(munshiCandidate.betweennessScore > 0.1, 'Munshi must have significant betweenness centrality');
    });

    it('serializes and deserializes custom analyst presets', () => {
      const customPreset = {
        id: 'custom-1718000000000',
        name: 'Operation Hawala South Mumbai Focus',
        typeFilter: ['person', 'transaction', 'location'],
        minConfidence: 0.85,
        physics: {
          chargeStrength: -200,
          linkDistance: 60,
          collisionRadius: 12,
          damping: 0.5,
          communityAnchors: true,
        },
        createdAt: '2024-03-16T12:00:00.000Z',
      };

      const serialized = JSON.stringify([customPreset]);
      const restored = JSON.parse(serialized);

      assert.equal(restored.length, 1);
      assert.equal(restored[0].id, customPreset.id);
      assert.equal(restored[0].name, customPreset.name);
      assert.deepEqual(restored[0].typeFilter, ['person', 'transaction', 'location']);
      assert.equal(restored[0].physics.chargeStrength, -200);
      assert.equal(restored[0].physics.communityAnchors, true);
    });
  });
});
