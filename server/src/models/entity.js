/**
 * CONSTELLATION — Entity Model & Validation
 */
import { ENTITY_TYPES } from '@constellation/shared/constants.js';

export const VALID_ENTITY_TYPES = new Set(Object.values(ENTITY_TYPES));

/**
 * Validates an entity object.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateEntity(entity) {
  const errors = [];

  if (!entity || typeof entity !== 'object') {
    return { valid: false, errors: ['Entity must be a non-null object'] };
  }

  if (!entity.id || typeof entity.id !== 'string' || entity.id.trim() === '') {
    errors.push('Entity must have a non-empty string "id"');
  }

  if (!entity.type || !VALID_ENTITY_TYPES.has(entity.type)) {
    errors.push(`Invalid entity type "${entity.type}". Must be one of: ${Array.from(VALID_ENTITY_TYPES).join(', ')}`);
  }

  if (!entity.label || typeof entity.label !== 'string' || entity.label.trim() === '') {
    errors.push('Entity must have a non-empty string "label"');
  }

  if (entity.caseIds && !Array.isArray(entity.caseIds)) {
    errors.push('"caseIds" must be an array of strings');
  }

  if (entity.confidence !== undefined) {
    if (typeof entity.confidence !== 'number' || entity.confidence < 0 || entity.confidence > 1) {
      errors.push('"confidence" must be a number between 0.0 and 1.0');
    }
  }

  if (entity.attributes && (typeof entity.attributes !== 'object' || Array.isArray(entity.attributes))) {
    errors.push('"attributes" must be a key-value object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Factory to create a sanitized, standardized entity
 */
export function createEntity(data) {
  const validation = validateEntity(data);
  if (!validation.valid) {
    throw new Error(`Entity validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    id: data.id.trim(),
    type: data.type,
    label: data.label.trim(),
    subType: data.subType || null,
    caseIds: Array.isArray(data.caseIds) ? [...new Set(data.caseIds)] : [],
    confidence: data.confidence !== undefined ? data.confidence : 1.0,
    attributes: { ...(data.attributes || {}) },
    source: data.source || 'INVESTIGATION_RECORD',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}
