/**
 * CONSTELLATION — Event / Timeline Model & Validation
 */

export const VALID_EVENT_TYPES = new Set([
  'CRIME',
  'COMMUNICATION',
  'CALL',
  'MESSAGE',
  'TRANSACTION',
  'LOCATION_VISIT',
  'MEETING',
  'EVIDENCE_DISCOVERY',
  'IMAGE_OCCURRENCE',
  'CASE_EVENT',
  'RAID_SEIZURE',
  'FIR_REGISTERED',
  'ARREST',
]);

export function validateEvent(event) {
  const errors = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  if (!event.id || typeof event.id !== 'string' || event.id.trim() === '') {
    errors.push('Event must have a non-empty string "id"');
  }

  if (!event.title || typeof event.title !== 'string' || event.title.trim() === '') {
    errors.push('Event must have a non-empty string "title"');
  }

  if (!event.timestamp || isNaN(Date.parse(event.timestamp))) {
    errors.push('Event must have a valid ISO-8601 "timestamp"');
  }

  if (event.eventType && !VALID_EVENT_TYPES.has(event.eventType)) {
    errors.push(`Invalid eventType "${event.eventType}". Valid types: ${Array.from(VALID_EVENT_TYPES).join(', ')}`);
  }

  if (event.entityIds && !Array.isArray(event.entityIds)) {
    errors.push('"entityIds" must be an array of strings');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createEvent(data) {
  const validation = validateEvent(data);
  if (!validation.valid) {
    throw new Error(`Event validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    id: data.id.trim(),
    title: data.title.trim(),
    description: data.description || '',
    eventType: data.eventType || 'CASE_EVENT',
    timestamp: new Date(data.timestamp).toISOString(),
    entityIds: Array.isArray(data.entityIds) ? [...new Set(data.entityIds)] : [],
    caseId: data.caseId || null,
    locationId: data.locationId || null,
    locationName: data.locationName || null,
    coordinates: data.coordinates || null, // { lat, lng }
    evidenceIds: Array.isArray(data.evidenceIds) ? [...new Set(data.evidenceIds)] : [],
    severity: data.severity || 'MEDIUM', // LOW | MEDIUM | HIGH | CRITICAL
    classification: data.classification || 'FACT', // FACT | INFERENCE | POTENTIAL_RELATIONSHIP
    metadata: { ...(data.metadata || {}) },
  };
}
