/**
 * CONSTELLATION — Location Model & Validation
 */

export function validateLocation(loc) {
  const errors = [];

  if (!loc || typeof loc !== 'object') {
    return { valid: false, errors: ['Location must be a non-null object'] };
  }

  if (!loc.id || typeof loc.id !== 'string' || loc.id.trim() === '') {
    errors.push('Location must have a non-empty string "id"');
  }

  if (typeof loc.latitude !== 'number' || loc.latitude < -90 || loc.latitude > 90 || isNaN(loc.latitude)) {
    errors.push('Location must have a valid "latitude" between -90 and 90');
  }

  if (typeof loc.longitude !== 'number' || loc.longitude < -180 || loc.longitude > 180 || isNaN(loc.longitude)) {
    errors.push('Location must have a valid "longitude" between -180 and 180');
  }

  if (!loc.city || typeof loc.city !== 'string') {
    errors.push('Location must have a string "city"');
  }

  if (loc.confidence !== undefined) {
    if (typeof loc.confidence !== 'number' || loc.confidence < 0 || loc.confidence > 1) {
      errors.push('"confidence" must be a number between 0.0 and 1.0');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createLocation(data) {
  const validation = validateLocation(data);
  if (!validation.valid) {
    throw new Error(`Location validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    id: data.id.trim(),
    name: data.name || `${data.city}, ${data.country || 'India'}`,
    latitude: data.latitude,
    longitude: data.longitude,
    address: data.address || '',
    city: data.city.trim(),
    state: data.state || '',
    country: data.country || 'India',
    timestamp: data.timestamp || null,
    entityId: data.entityId || null,
    caseId: data.caseId || null,
    eventId: data.eventId || null,
    locationType: data.locationType || 'OPERATIONAL_SITE', // RESIDENCE | OPERATIONAL_SITE | MEETING_POINT | TRANSIT_HUB | FINANCIAL_INSTITUTION
    source: data.source || 'CELL_TOWER_TRIANGULATION',
    confidence: data.confidence !== undefined ? data.confidence : 1.0,
    metadata: { ...(data.metadata || {}) },
  };
}
