/**
 * CONSTELLATION — Ingestion Normalization Service
 *
 * Standardizes text, phone numbers, hardware IMEIs, vehicle registration plates,
 * geographical coordinates, and chronological timestamps before entity resolution.
 */

/**
 * Normalizes phone numbers:
 * - Strips formatting characters (spaces, hyphens, brackets, dots)
 * - Formats 10-digit Indian mobile numbers with '+91'
 * - Preserves international format with leading '+'
 */
export function normalizePhoneNumber(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s\(\)\-\.]/g, '');
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Normalizes 15-digit hardware IMEI identifiers
 */
export function normalizeIMEI(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\D/g, '');
  return cleaned.length >= 14 && cleaned.length <= 16 ? cleaned : cleaned;
}

/**
 * Normalizes vehicle registration plates:
 * Uppercases and removes spaces/hyphens (e.g. 'DL-10-CA-4491' -> 'DL10CA4491')
 */
export function normalizeVehiclePlate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.toUpperCase().replace(/[\s\-\.]/g, '');
}

/**
 * Normalizes geographical coordinates rounded to 6 decimal places (~0.1m precision)
 */
export function normalizeCoordinate(raw, type = 'latitude') {
  const num = parseFloat(raw);
  if (isNaN(num)) return null;
  const rounded = Math.round(num * 1000000) / 1000000;
  if (type === 'latitude' && (rounded < -90 || rounded > 90)) return null;
  if (type === 'longitude' && (rounded < -180 || rounded > 180)) return null;
  return rounded;
}

/**
 * Normalizes timestamps to ISO 8601 strings
 */
export function normalizeTimestamp(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Normalizes human labels: collapses redundant whitespace, trims
 */
export function normalizeLabel(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes an entity object
 */
export function normalizeEntity(raw) {
  const entity = { ...raw };

  entity.id = entity.id ? String(entity.id).trim() : null;
  entity.type = entity.type ? String(entity.type).toLowerCase().trim() : null;
  entity.label = normalizeLabel(entity.label);
  entity.subType = entity.subType ? normalizeLabel(entity.subType) : null;
  entity.caseIds = Array.isArray(entity.caseIds) ? entity.caseIds.map(c => String(c).trim()) : [];
  if (entity.confidence === undefined) {
    entity.confidence = 1.0;
  }

  const attrs = { ...(entity.attributes || {}) };

  // Normalize phone attributes
  if (attrs.phoneNumber) attrs.phoneNumber = normalizePhoneNumber(attrs.phoneNumber);
  if (attrs.number) attrs.number = normalizePhoneNumber(attrs.number);
  if (attrs.phone) attrs.phone = normalizePhoneNumber(attrs.phone);

  // Normalize IMEI attributes
  if (attrs.imei) attrs.imei = normalizeIMEI(attrs.imei);
  if (attrs.hardwareId) attrs.hardwareId = normalizeIMEI(attrs.hardwareId);

  // Normalize vehicle plate attributes
  if (attrs.plate) attrs.plate = normalizeVehiclePlate(attrs.plate);
  if (attrs.registrationNumber) attrs.registrationNumber = normalizeVehiclePlate(attrs.registrationNumber);
  if (attrs.vehicleNumber) attrs.vehicleNumber = normalizeVehiclePlate(attrs.vehicleNumber);

  entity.attributes = attrs;
  return entity;
}

/**
 * Normalizes a relationship object
 */
export function normalizeRelationship(raw) {
  const rel = { ...raw };
  rel.id = rel.id ? String(rel.id).trim() : null;
  rel.source = rel.source ? String(rel.source).trim() : null;
  rel.target = rel.target ? String(rel.target).trim() : null;
  rel.type = rel.type ? String(rel.type).toUpperCase().trim() : null;
  rel.label = rel.label ? normalizeLabel(rel.label) : rel.type;
  if (rel.confidence === undefined) {
    rel.confidence = 1.0;
  }
  rel.caseIds = Array.isArray(rel.caseIds) ? rel.caseIds.map(c => String(c).trim()) : [];
  rel.evidenceIds = Array.isArray(rel.evidenceIds) ? rel.evidenceIds.map(e => String(e).trim()) : [];
  rel.timestamp = normalizeTimestamp(rel.timestamp);
  return rel;
}

/**
 * Normalizes a location object
 */
export function normalizeLocation(raw) {
  const loc = { ...raw };
  loc.id = loc.id ? String(loc.id).trim() : null;
  loc.latitude = normalizeCoordinate(loc.latitude, 'latitude');
  loc.longitude = normalizeCoordinate(loc.longitude, 'longitude');
  loc.city = loc.city ? normalizeLabel(loc.city) : '';
  loc.country = loc.country ? normalizeLabel(loc.country) : 'India';
  loc.name = loc.name ? normalizeLabel(loc.name) : `${loc.city}, ${loc.country}`;
  loc.timestamp = normalizeTimestamp(loc.timestamp);
  if (loc.confidence === undefined) {
    loc.confidence = 1.0;
  }
  return loc;
}

/**
 * Normalizes an event object
 */
export function normalizeEvent(raw) {
  const ev = { ...raw };
  ev.id = ev.id ? String(ev.id).trim() : null;
  ev.timestamp = normalizeTimestamp(ev.timestamp);
  ev.title = normalizeLabel(ev.title);
  ev.eventType = ev.eventType ? String(ev.eventType).toUpperCase().trim() : 'CASE_EVENT';
  ev.category = ev.category ? String(ev.category).toUpperCase().trim() : 'INVESTIGATION';
  ev.entityIds = Array.isArray(ev.entityIds) ? ev.entityIds.map(e => String(e).trim()) : [];
  return ev;
}

/**
 * Normalizes an evidence object
 */
export function normalizeEvidence(raw) {
  const ev = { ...raw };
  ev.id = ev.id ? String(ev.id).trim() : null;
  ev.title = normalizeLabel(ev.title);
  if (ev.evidenceType) {
    ev.evidenceType = String(ev.evidenceType).toUpperCase().trim();
  } else {
    ev.evidenceType = 'DOCUMENT';
  }
  ev.hash = ev.hash ? String(ev.hash).trim() : null;
  ev.classification = ev.classification ? String(ev.classification).toUpperCase().trim() : 'FACT';
  ev.confidence = typeof ev.confidence === 'number' ? Math.max(0, Math.min(1, ev.confidence)) : 1.0;
  return ev;
}
