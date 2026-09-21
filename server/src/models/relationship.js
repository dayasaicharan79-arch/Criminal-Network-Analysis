/**
 * CONSTELLATION — Relationship Model & Validation
 */
import { RELATIONSHIP_TYPES } from '@constellation/shared/constants.js';

export const VALID_RELATIONSHIP_TYPES = new Set(Object.values(RELATIONSHIP_TYPES));

/**
 * Validates a relationship object.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateRelationship(rel) {
  const errors = [];

  if (!rel || typeof rel !== 'object') {
    return { valid: false, errors: ['Relationship must be a non-null object'] };
  }

  if (!rel.id || typeof rel.id !== 'string' || rel.id.trim() === '') {
    errors.push('Relationship must have a non-empty string "id"');
  }

  if (!rel.source || typeof rel.source !== 'string' || rel.source.trim() === '') {
    errors.push('Relationship must have a valid source entity ID');
  }

  if (!rel.target || typeof rel.target !== 'string' || rel.target.trim() === '') {
    errors.push('Relationship must have a valid target entity ID');
  }

  if (!rel.type || !VALID_RELATIONSHIP_TYPES.has(rel.type)) {
    errors.push(`Invalid relationship type "${rel.type}". Must be one of: ${Array.from(VALID_RELATIONSHIP_TYPES).join(', ')}`);
  }

  if (rel.confidence !== undefined) {
    if (typeof rel.confidence !== 'number' || rel.confidence < 0 || rel.confidence > 1) {
      errors.push('"confidence" must be a number between 0.0 and 1.0');
    }
  }

  if (rel.caseIds && !Array.isArray(rel.caseIds)) {
    errors.push('"caseIds" must be an array of strings');
  }

  if (rel.evidenceIds && !Array.isArray(rel.evidenceIds)) {
    errors.push('"evidenceIds" must be an array of strings');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Factory to create a sanitized, standardized relationship
 */
export function createRelationship(data) {
  const validation = validateRelationship(data);
  if (!validation.valid) {
    throw new Error(`Relationship validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    id: data.id.trim(),
    source: data.source.trim(),
    target: data.target.trim(),
    type: data.type,
    label: data.label || data.type,
    confidence: data.confidence !== undefined ? data.confidence : 1.0,
    caseIds: Array.isArray(data.caseIds) ? [...new Set(data.caseIds)] : [],
    evidenceIds: Array.isArray(data.evidenceIds) ? [...new Set(data.evidenceIds)] : [],
    provenance: data.provenance || 'DIRECT_OBSERVATION', // DIRECT_OBSERVATION | EXTRACTED_CDR | FORENSIC_REPORT | INFERRED
    classification: data.classification || 'FACT', // FACT | INFERENCE | POTENTIAL_RELATIONSHIP | PREDICTION
    timestamp: data.timestamp || null,
    metadata: { ...(data.metadata || {}) },
    createdAt: data.createdAt || new Date().toISOString(),
  };
}
