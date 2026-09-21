/**
 * CONSTELLATION — Seed Runner Script
 */
import { store } from '../store.js';
import { SYNTHETIC_DATASET } from './syntheticData.js';

export function runSeed(customData = null) {
  const data = customData || SYNTHETIC_DATASET;
  const counts = store.seed(data);
  console.log(`\n  ✦  CONSTELLATION Database Seeded Successfully`);
  console.log(`     Cases         : ${counts.cases}`);
  console.log(`     Entities      : ${counts.entities}`);
  console.log(`     Relationships : ${counts.relationships}`);
  console.log(`     Locations     : ${counts.locations}`);
  console.log(`     Events        : ${counts.events}`);
  console.log(`     Evidence      : ${counts.evidence}\n`);
  return counts;
}

// If invoked directly from CLI (e.g., node server/src/data/seed/index.js)
if (process.argv[1] && process.argv[1].endsWith('seed/index.js')) {
  runSeed();
}
