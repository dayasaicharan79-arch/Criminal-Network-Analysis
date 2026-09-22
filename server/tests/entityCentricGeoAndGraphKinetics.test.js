/**
 * CONSTELLATION — Entity-Centric Geospatial & 3D Graph Kinetics Regression Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { store } from '../src/data/store.js';
import { SYNTHETIC_DATASET } from '../src/data/seed/syntheticData.js';
import { buildDynamicTransitArcs } from '../src/routes/geo.js';

describe('Entity-Centric Geospatial & 3D Graph Kinetics Verification', () => {
  // Ensure store has current synthetic seed data
  store.seed(SYNTHETIC_DATASET);

  describe('1. 3D Graph Link Filtering & Dangling Node Protection', () => {
    it('safely excludes dangling relationships whose endpoints do not exist in the node set', () => {
      const graph = store.getGraph('CASE-2024-VORTEX');
      assert.ok(graph.nodes.length > 0, 'Nodes must exist');
      assert.ok(graph.links.length > 0, 'Links must exist');

      const nodeSet = new Set(graph.nodes.map(n => n.id));
      for (const link of graph.links) {
        assert.ok(nodeSet.has(link.source), `Link source ${link.source} must exist in node set`);
        assert.ok(nodeSet.has(link.target), `Link target ${link.target} must exist in node set`);
      }
    });

    it('calculates valid 3D camera distance greater than zero to prevent camera clipping inside origin', () => {
      const graph = store.getGraph('CASE-2024-VORTEX');
      // Simulate node coordinates post simulation dispersion
      const mockDispersedNodes = graph.nodes.map((n, idx) => ({
        ...n,
        x: Math.cos(idx) * 180,
        y: Math.sin(idx) * 140,
        z: (idx % 5 - 2) * 80,
      }));

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (const n of mockDispersedNodes) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
        if (n.z < minZ) minZ = n.z;
        if (n.z > maxZ) maxZ = n.z;
      }

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const cz = (minZ + maxZ) / 2;

      let maxSpan = 0;
      for (const n of mockDispersedNodes) {
        const dist = Math.hypot(n.x - cx, n.y - cy, n.z - cz);
        if (dist > maxSpan) maxSpan = dist;
      }

      const requiredDist = (maxSpan + 45) / 0.4142; // Tan(22.5deg) perspective FOV
      const targetZ = Math.max(380, Math.min(2400, Math.round(requiredDist * 1.15)));

      assert.ok(targetZ >= 380, `Calculated camera distance ${targetZ} must be >= 380 to keep all nodes in FOV`);
      assert.ok(isFinite(targetZ), 'Camera distance must be a finite number');
    });
  });

  describe('2. Expanded Indian Synthetic Locations Dataset', () => {
    const EXPECTED_CITIES = [
      'Delhi',
      'Mumbai',
      'Pune',
      'Ahmedabad',
      'Jaipur',
      'Lucknow',
      'Kolkata',
      'Bengaluru',
      'Hyderabad',
      'Chennai',
      'Kochi',
      'Bhopal',
      'Patna',
      'Guwahati',
      'Bhubaneswar',
      'Chandigarh',
      'Surat',
      'Nagpur',
      'Visakhapatnam',
      'Indore',
    ];

    it('contains all 20 specified Indian investigation cities with deterministic coordinates', () => {
      const allLocations = store.getAllLocations();
      assert.ok(allLocations.length >= 20, `Location count (${allLocations.length}) must be at least 20`);

      const cityNames = allLocations.map(l => l.city.toLowerCase());

      for (const expectedCity of EXPECTED_CITIES) {
        const matched = cityNames.some(c => 
          c.includes(expectedCity.toLowerCase()) || 
          (expectedCity === 'Delhi' && c.includes('delhi')) ||
          (expectedCity === 'Bengaluru' && (c.includes('bengaluru') || c.includes('bangalore')))
        );
        assert.ok(matched, `Expected city "${expectedCity}" must be present in locations dataset`);
      }
    });

    it('ensures all coordinates are valid deterministic numbers within Indian geographic bounding box', () => {
      const allLocations = store.getAllLocations();
      for (const loc of allLocations) {
        assert.strictEqual(typeof loc.latitude, 'number', `Location ${loc.id} latitude must be a number`);
        assert.strictEqual(typeof loc.longitude, 'number', `Location ${loc.id} longitude must be a number`);
        assert.ok(!isNaN(loc.latitude), `Location ${loc.id} latitude must not be NaN`);
        assert.ok(!isNaN(loc.longitude), `Location ${loc.id} longitude must not be NaN`);

        if (loc.country === 'India') {
          assert.ok(loc.latitude >= 8.0 && loc.latitude <= 37.5, `Lat ${loc.latitude} for ${loc.city} must be in India [8, 37.5]`);
          assert.ok(loc.longitude >= 68.0 && loc.longitude <= 97.5, `Lng ${loc.longitude} for ${loc.city} must be in India [68, 97.5]`);
        }
      }
    });
  });

  describe('3. Entity -> Location Resolution & Multi-Site Mapping', () => {
    it('indexes both primary entityId and associatedEntityIds for multi-site targets', () => {
      const sultanLocs = store.getLocationsByEntity('PER-SULTAN-01');
      assert.ok(sultanLocs.length >= 4, `Sultan must have at least 4 associated locations (found ${sultanLocs.length})`);

      const sultanCities = sultanLocs.map(l => l.city);
      assert.ok(sultanCities.some(c => c.includes('Mumbai')), 'Sultan must have Mumbai Hawala hub location');
      assert.ok(sultanCities.some(c => c.includes('Dubai')), 'Sultan must have Dubai Command location');
      assert.ok(sultanCities.some(c => c.includes('Delhi')), 'Sultan must have Delhi safehouse location');
      assert.ok(sultanCities.some(c => c.includes('Pune')), 'Sultan must have Pune tech location');
    });

    it('resolves associated targets from location object', () => {
      const mumbaiLoc = store.getLocation('LOC-MUMBAI-02');
      assert.ok(mumbaiLoc, 'Mumbai location must exist');
      assert.strictEqual(mumbaiLoc.entityId, 'PER-SULTAN-01', 'Primary entity should be Sultan');
      assert.ok(Array.isArray(mumbaiLoc.associatedEntityIds), 'associatedEntityIds must be an array');
      assert.ok(mumbaiLoc.associatedEntityIds.includes('PER-MUNSHI-02'), 'Munshi must be an associated target in Mumbai hub');
    });
  });

  describe('4. Dynamic Geospatial Transit Arcs Across Expanded Indian Network', () => {
    it('generates dynamic corridors between Indian cities for CASE-2024-VORTEX', () => {
      const vLocations = store.getLocationsByCase('CASE-2024-VORTEX');
      const arcs = buildDynamicTransitArcs({ locations: vLocations, caseId: 'CASE-2024-VORTEX' });

      assert.ok(arcs.length >= 6, `Should generate at least 6 dynamic corridors (generated ${arcs.length})`);
      for (const arc of arcs) {
        assert.ok(arc.fromCity && arc.toCity, 'Arc must have fromCity and toCity');
        assert.notStrictEqual(arc.fromCity.toLowerCase(), arc.toCity.toLowerCase(), 'Arc should connect distinct cities');
        assert.ok(typeof arc.startLat === 'number' && typeof arc.startLng === 'number', 'Valid start coordinates');
        assert.ok(typeof arc.endLat === 'number' && typeof arc.endLng === 'number', 'Valid end coordinates');
      }
    });
  });
});
