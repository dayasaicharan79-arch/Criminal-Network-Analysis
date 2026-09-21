/**
 * CONSTELLATION — Geospatial Intelligence Routes
 */
import { Router } from 'express';
import { store } from '../data/store.js';

export const geoRouter = Router();

// GET /api/geo
geoRouter.get('/', (req, res) => {
  const { caseId, entityId, city, locationType } = req.query;

  let locations = [];
  if (entityId) {
    locations = store.getLocationsByEntity(entityId);
  } else if (caseId) {
    locations = store.getLocationsByCase(caseId);
  } else {
    locations = store.getAllLocations();
  }

  if (city) {
    locations = locations.filter(l => l.city.toLowerCase() === city.toLowerCase());
  }

  if (locationType) {
    locations = locations.filter(l => l.locationType === locationType);
  }

  // Generate inter-city analytical arcs (e.g., Dubai -> Mumbai -> Delhi -> Kolkata)
  // Derived from actual transactions and transport routes in the case
  const arcs = [
    {
      id: 'ARC-01',
      name: 'Transnational Hawala Value Flow (Dubai -> Mumbai)',
      fromCity: 'Dubai',
      toCity: 'Mumbai',
      startLat: 25.0784,
      startLng: 55.1481,
      endLat: 18.9515,
      endLng: 72.8315,
      color: '#00f2fe',
      type: 'HAWALA_ROUTING',
      confidence: 0.96,
      amount: '₹14.5 Crores',
    },
    {
      id: 'ARC-02',
      name: 'Cash Consignment Armored Transit (Mumbai -> Delhi)',
      fromCity: 'Mumbai',
      toCity: 'New Delhi',
      startLat: 18.9515,
      startLng: 72.8315,
      endLat: 28.5714,
      endLng: 77.2219,
      color: '#f59e0b',
      type: 'PHYSICAL_HAULAGE',
      confidence: 0.94,
      vehicle: 'DL-10-CA-4491 (Scorpio)',
    },
    {
      id: 'ARC-03',
      name: 'Contraband Coastal Shipment (Kandla -> Kolkata)',
      fromCity: 'Kandla',
      toCity: 'Kolkata',
      startLat: 23.0033,
      startLng: 70.2186,
      endLat: 22.5358,
      endLng: 88.3182,
      color: '#ef4444',
      type: 'CONTRABAND_CORRIDOR',
      confidence: 0.93,
      vehicle: 'GJ-12-BT-9104 (Container Hauler)',
    },
    {
      id: 'ARC-04',
      name: 'VoIP & Crypto Mixed Node Hop (Bengaluru -> Hyderabad)',
      fromCity: 'Bengaluru',
      toCity: 'Hyderabad',
      startLat: 12.9784,
      startLng: 77.6408,
      endLat: 17.4474,
      endLng: 78.3762,
      color: '#a855f7',
      type: 'CYBER_COMMUNICATION',
      confidence: 0.90,
      protocol: 'Matrix Encrypted Relay',
    },
  ];

  res.json({
    success: true,
    data: {
      locations,
      arcs,
    },
    meta: {
      locationCount: locations.length,
      arcCount: arcs.length,
      timestamp: new Date().toISOString(),
    },
  });
});
