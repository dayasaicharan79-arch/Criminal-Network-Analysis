/**
 * CONSTELLATION — Evidence & Provenance Model & Validation
 */

export const VALID_EVIDENCE_TYPES = new Set([
  'DOCUMENT',
  'CDR_LOG',
  'BANK_STATEMENT',
  'CCTV_STILL',
  'SEIZED_DEVICE',
  'AUDIO_INTERCEPT',
  'FORENSIC_REPORT',
  'FSL_BALLISTICS',
  'VEHICLE_REGISTRY',
  'IMMIGRATION_RECORD',
]);

export function validateEvidence(ev) {
  const errors = [];

  if (!ev || typeof ev !== 'object') {
    return { valid: false, errors: ['Evidence must be a non-null object'] };
  }

  if (!ev.id || typeof ev.id !== 'string' || ev.id.trim() === '') {
    errors.push('Evidence must have a non-empty string "id"');
  }

  if (!ev.title || typeof ev.title !== 'string' || ev.title.trim() === '') {
    errors.push('Evidence must have a non-empty string "title"');
  }

  if (ev.evidenceType && !VALID_EVIDENCE_TYPES.has(ev.evidenceType)) {
    errors.push(`Invalid evidenceType "${ev.evidenceType}". Valid types: ${Array.from(VALID_EVIDENCE_TYPES).join(', ')}`);
  }

  if (ev.confidence !== undefined) {
    if (typeof ev.confidence !== 'number' || ev.confidence < 0 || ev.confidence > 1) {
      errors.push('"confidence" must be a number between 0.0 and 1.0');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createEvidence(data) {
  const validation = validateEvidence(data);
  if (!validation.valid) {
    throw new Error(`Evidence validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    id: data.id.trim(),
    title: data.title.trim(),
    description: data.description || '',
    evidenceType: data.evidenceType || 'DOCUMENT',
    source: data.source || 'POLICE_EVIDENCE_LOCKER',
    chainOfCustody: Array.isArray(data.chainOfCustody) ? data.chainOfCustody : [
      {
        timestamp: data.timestamp || new Date().toISOString(),
        officer: data.recoveringOfficer || 'Investigating Officer',
        action: 'RECOVERED_AND_LOGGED',
        facility: 'Cyber Crime Police Station / Special Cell',
        hashVerified: true,
      }
    ],
    hash: data.hash || 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
    entityIds: Array.isArray(data.entityIds) ? [...new Set(data.entityIds)] : [],
    relationshipIds: Array.isArray(data.relationshipIds) ? [...new Set(data.relationshipIds)] : [],
    caseId: data.caseId || null,
    eventId: data.eventId || null,
    classification: data.classification || 'FACT', // FACT | INFERENCE | POTENTIAL_RELATIONSHIP | PREDICTION
    confidence: data.confidence !== undefined ? data.confidence : 1.0,
    mediaUrl: data.mediaUrl || null,
    documentContent: data.documentContent || null,
    metadata: { ...(data.metadata || {}) },
  };
}
