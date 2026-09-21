/**
 * CONSTELLATION — Case Model & Validation
 */

export function validateCase(c) {
  const errors = [];

  if (!c || typeof c !== 'object') {
    return { valid: false, errors: ['Case must be a non-null object'] };
  }

  if (!c.id || typeof c.id !== 'string' || c.id.trim() === '') {
    errors.push('Case must have a non-empty string "id"');
  }

  if (!c.title || typeof c.title !== 'string' || c.title.trim() === '') {
    errors.push('Case must have a non-empty string "title"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createCase(data) {
  const validation = validateCase(data);
  if (!validation.valid) {
    throw new Error(`Case validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    id: data.id.trim(),
    title: data.title.trim(),
    firNumber: data.firNumber || `FIR-${Math.floor(1000 + Math.random() * 9000)}/2024`,
    status: data.status || 'ACTIVE', // ACTIVE | UNDER_SURVEILLANCE | CHARGE_SHEET_FILED | ARCHIVED
    leadAgency: data.leadAgency || 'Special Cell Intelligence Division',
    leadInvestigator: data.leadInvestigator || 'ACP R. S. Rathore',
    summary: data.summary || '',
    keySections: Array.isArray(data.keySections) ? data.keySections : ['IPC 420', 'IPC 120B', 'PMLA Sec 3'],
    priority: data.priority || 'HIGH', // CRITICAL | HIGH | MEDIUM | LOW
    openedDate: data.openedDate || new Date().toISOString(),
    primarySuspectIds: Array.isArray(data.primarySuspectIds) ? data.primarySuspectIds : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: data.createdAt || new Date().toISOString(),
  };
}
