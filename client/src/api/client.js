/**
 * CONSTELLATION — Centralized API Client Layer
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = body?.error?.message || `Request failed with HTTP ${res.status}`;
      const err = new Error(errorMsg);
      err.code = body?.error?.code || 'HTTP_ERROR';
      err.status = res.status;
      throw err;
    }

    return body;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Cases
  getCases: () => request('/cases'),
  getCaseById: (id) => request(`/cases/${encodeURIComponent(id)}`),

  // Search
  search: (query, params = {}) => {
    const sp = new URLSearchParams({ q: query, ...params });
    return request(`/search?${sp.toString()}`);
  },

  // Entities
  getEntities: (params = {}) => {
    const sp = new URLSearchParams(params);
    return request(`/entities?${sp.toString()}`);
  },
  getEntityById: (id) => request(`/entities/${encodeURIComponent(id)}`),
  getEntityRelationships: (id) => request(`/entities/${encodeURIComponent(id)}/relationships`),
  getEntityTimeline: (id) => request(`/entities/${encodeURIComponent(id)}/timeline`),
  getEntityLocations: (id) => request(`/entities/${encodeURIComponent(id)}/locations`),
  getEntityEvidence: (id) => request(`/entities/${encodeURIComponent(id)}/evidence`),

  // Knowledge Graph
  getGraph: (params = {}) => {
    const sp = new URLSearchParams(params);
    return request(`/graph?${sp.toString()}`);
  },
  expandGraphNode: (id, depth = 1) => request(`/graph/expand/${encodeURIComponent(id)}?depth=${depth}`),

  // Graph Analytics
  getAnalytics: (caseId) => request(`/analytics${caseId ? `/${encodeURIComponent(caseId)}` : ''}`),
  getShortestPath: (from, to, caseId) => {
    const sp = new URLSearchParams({ from, to, ...(caseId ? { caseId } : {}) });
    return request(`/analytics/path?${sp.toString()}`);
  },

  // Timeline
  getTimeline: (params = {}) => {
    const sp = new URLSearchParams(params);
    return request(`/timeline?${sp.toString()}`);
  },

  // Geospatial
  getGeoData: (params = {}) => {
    const sp = new URLSearchParams(params);
    return request(`/geo?${sp.toString()}`);
  },

  // Evidence
  getEvidence: (params = {}) => {
    const sp = new URLSearchParams(params);
    return request(`/evidence?${sp.toString()}`);
  },
  getEvidenceById: (id) => request(`/evidence/${encodeURIComponent(id)}`),

  // AI Assistant
  querySherlock: (payload) => request('/ai/sherlock', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  queryMoriarty: (payload) => request('/ai/moriarty', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

export default api;
