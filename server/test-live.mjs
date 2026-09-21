const endpoints = [
  { name: 'Health', path: '/api/health' },
  { name: 'Cases', path: '/api/cases' },
  { name: 'Entities', path: '/api/entities?caseId=CASE-2024-VORTEX' },
  { name: 'Search', path: '/api/search?q=Munshi' },
  { name: 'Graph', path: '/api/graph?caseId=CASE-2024-VORTEX' },
  { name: 'Analytics', path: '/api/analytics/CASE-2024-VORTEX' },
  { name: 'Path', path: '/api/analytics/path?from=PER-SULTAN-01&to=PER-DRIVER-06&caseId=CASE-2024-VORTEX' },
  { name: 'Timeline', path: '/api/timeline?caseId=CASE-2024-VORTEX' },
  { name: 'Geo', path: '/api/geo?caseId=CASE-2024-VORTEX' },
  { name: 'Evidence', path: '/api/evidence?caseId=CASE-2024-VORTEX' },
];

for (const ep of endpoints) {
  const res = await fetch(`http://127.0.0.1:3001${ep.path}`);
  const json = await res.json();
  console.log(`✓ ${ep.name.padEnd(12)} -> HTTP ${res.status}, success: ${json.success}`);
}

// Test Sherlock POST
const sherlockRes = await fetch('http://127.0.0.1:3001/api/ai/sherlock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'Show connections around Munshi', caseId: 'CASE-2024-VORTEX' }),
});
const sherlockJson = await sherlockRes.json();
console.log(`✓ ${'AI Sherlock'.padEnd(12)} -> HTTP ${sherlockRes.status}, answer len: ${sherlockJson.data?.answer?.length}`);

// Test Moriarty POST
const moriartyRes = await fetch('http://127.0.0.1:3001/api/ai/moriarty', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ caseId: 'CASE-2024-VORTEX' }),
});
const moriartyJson = await moriartyRes.json();
console.log(`✓ ${'AI Moriarty'.padEnd(12)} -> HTTP ${moriartyRes.status}, assessments: ${moriartyJson.data?.adversarialAssessments?.length}`);
