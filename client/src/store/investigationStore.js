/**
 * CONSTELLATION — Canonical Investigation State Store (Zustand)
 * 
 * Central nervous system maintaining real-time synchronization across:
 * GRAPH ↔ TIMELINE ↔ GEOGRAPHY ↔ ENTITY ↔ EVIDENCE ↔ AI
 */
import { create } from 'zustand';
import { api } from '../api/client.js';

export const DEFAULT_GRAPH_PHYSICS = {
  chargeStrength: -160,    // Repulsion (-50 to -600)
  linkDistance: 45,        // Spring distance (15 to 150)
  collisionRadius: 15,     // Anti-overlap radius (0 to 30)
  damping: 0.4,            // Velocity decay / damping (0.1 to 0.8)
  velocityDecay: 0.4,     // Damping/stability alias
  communityAnchors: false, // Cluster around community centroids
};

export const DEFAULT_TIMELINE_PLAYBACK = {
  isPlaying: false,
  currentTime: null,        // ISO string or timestamp ms
  timeWindowMs: 86400000,   // 24 hours window for 'window' mode
  windowMode: 'cumulative', // 'cumulative' | 'slice'
  speed: 1,                 // 0.5, 1, 2, 4
  playbackSpeed: 1,         // Speed alias
  activeEventIndex: -1,     // Index into sorted events
};

const loadSavedPresets = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem('constellation_query_presets');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const useInvestigationStore = create((set, get) => ({
  // Core Navigation & View
  activeView: 'graph', // 'graph' | 'geo' | 'timeline' | 'analytics' | 'evidence' | 'sherlock' | 'moriarty' | 'cinema'
  activeCaseId: 'CASE-2024-VORTEX',
  activeCase: null,
  cases: [],

  // Canonical Selection State
  selectedEntityId: null,
  selectedEntity: null,
  selectedRelationshipId: null,
  selectedRelationship: null,
  selectedEventId: null,
  selectedLocationId: null,
  selectedEvidenceId: null,

  // Datasets
  graphData: { nodes: [], links: [] },
  geoData: { locations: [], arcs: [] },
  timelineEvents: [],
  evidenceList: [],
  analyticsData: null,

  // Search & Filters
  searchQuery: '',
  searchResults: [],
  filterMinConfidence: 0.0,
  filterEntityTypes: [], // empty = all
  filterTimeRange: null, // { start, end }

  // Graph Physics Tuning
  graphPhysics: { ...DEFAULT_GRAPH_PHYSICS },

  // Timeline Playback Synchronization
  timelinePlayback: { ...DEFAULT_TIMELINE_PLAYBACK },

  // Analyst Query Presets
  activePresetId: null,
  customPresets: loadSavedPresets(),

  // Status & Telemetry
  loading: false,
  error: null,
  cinemaPlaying: false,
  cinemaStep: 0,
  isReportModalOpen: false,

  // ---------------------------------------------------------------------------
  // Setters & Simple Actions
  // ---------------------------------------------------------------------------
  setActiveView: (view) => set({ activeView: view }),
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),

  setFilterMinConfidence: (val) => {
    set({ filterMinConfidence: val });
    get().reloadGraph();
  },

  toggleEntityTypeFilter: (type) => {
    const current = get().filterEntityTypes;
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    set({ filterEntityTypes: next });
    get().reloadGraph();
  },

  clearFilters: () => {
    set({ filterMinConfidence: 0.0, filterEntityTypes: [], filterTimeRange: null, activePresetId: null });
    get().reloadGraph();
  },

  // ---------------------------------------------------------------------------
  // Graph Physics Actions
  // ---------------------------------------------------------------------------
  setGraphPhysics: (patch) => {
    const fullPatch = { ...patch };
    if (fullPatch.velocityDecay !== undefined && fullPatch.damping === undefined) {
      fullPatch.damping = fullPatch.velocityDecay;
    } else if (fullPatch.damping !== undefined && fullPatch.velocityDecay === undefined) {
      fullPatch.velocityDecay = fullPatch.damping;
    }
    set(state => ({ graphPhysics: { ...state.graphPhysics, ...fullPatch } }));
  },

  resetGraphPhysics: () => {
    set({ graphPhysics: { ...DEFAULT_GRAPH_PHYSICS } });
  },

  // ---------------------------------------------------------------------------
  // Timeline Playback Actions
  // ---------------------------------------------------------------------------
  setTimelinePlayback: (patch) => {
    set(state => ({ timelinePlayback: { ...state.timelinePlayback, ...patch } }));
  },

  togglePlayback: () => {
    const isPlaying = !get().timelinePlayback.isPlaying;
    const sorted = [...get().timelineEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (isPlaying && !get().timelinePlayback.currentTime && sorted.length > 0) {
      set(state => ({
        timelinePlayback: {
          ...state.timelinePlayback,
          isPlaying: true,
          currentTime: sorted[0].timestamp,
          activeEventIndex: 0,
        },
      }));
    } else {
      set(state => ({
        timelinePlayback: {
          ...state.timelinePlayback,
          isPlaying,
        },
      }));
    }
  },

  stepPlayback: (direction) => {
    const sorted = [...get().timelineEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (sorted.length === 0) return;
    const currentIndex = get().timelinePlayback.activeEventIndex;
    let nextIndex = currentIndex === -1 ? 0 : currentIndex + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= sorted.length) nextIndex = sorted.length - 1;
    const nextEvent = sorted[nextIndex];
    set(state => ({
      timelinePlayback: {
        ...state.timelinePlayback,
        currentTime: nextEvent.timestamp,
        activeEventIndex: nextIndex,
      },
      selectedEventId: nextEvent.id,
    }));
  },

  resetPlayback: () => {
    const sorted = [...get().timelineEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    set(state => ({
      timelinePlayback: {
        ...state.timelinePlayback,
        isPlaying: false,
        currentTime: sorted.length > 0 ? sorted[0].timestamp : null,
        activeEventIndex: sorted.length > 0 ? 0 : -1,
      },
    }));
  },

  // ---------------------------------------------------------------------------
  // Analyst Query Presets Actions
  // ---------------------------------------------------------------------------
  applyPreset: (presetId) => {
    if (presetId === 'hawala') {
      set({
        activePresetId: 'hawala',
        filterEntityTypes: ['person', 'criminal', 'suspect', 'organization', 'transaction'],
        filterMinConfidence: 0.8,
      });
      get().reloadGraph();
    } else if (presetId === 'burner') {
      set({
        activePresetId: 'burner',
        filterEntityTypes: ['phone', 'device', 'person', 'criminal', 'suspect'],
        filterMinConfidence: 0.0,
      });
      get().reloadGraph();
    } else if (presetId === 'bridges') {
      set({
        activePresetId: 'bridges',
        filterEntityTypes: [],
        filterMinConfidence: 0.0,
      });
      const topBridge = get().analyticsData?.bridgeNodes?.[0];
      if (topBridge) {
        get().selectEntity(topBridge.id);
      }
      get().reloadGraph();
    } else if (presetId === 'clear') {
      set({
        activePresetId: null,
        filterEntityTypes: [],
        filterMinConfidence: 0.0,
      });
      get().reloadGraph();
    } else {
      const custom = get().customPresets.find(p => p.id === presetId);
      if (custom) {
        set({
          activePresetId: custom.id,
          filterEntityTypes: custom.typeFilter || [],
          filterMinConfidence: custom.minConfidence || 0.0,
          graphPhysics: custom.physics ? { ...get().graphPhysics, ...custom.physics } : get().graphPhysics,
        });
        get().reloadGraph();
      }
    }
  },

  saveCustomPreset: (name) => {
    if (!name || !name.trim()) return;
    const newPreset = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      typeFilter: [...get().filterEntityTypes],
      minConfidence: get().filterMinConfidence,
      physics: { ...get().graphPhysics },
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().customPresets.filter(p => p.name !== newPreset.name), newPreset];
    try {
      localStorage.setItem('constellation_query_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage preset save error:', e);
    }
    set({ customPresets: updated, activePresetId: newPreset.id });
  },

  deleteCustomPreset: (presetId) => {
    const updated = get().customPresets.filter(p => p.id !== presetId);
    try {
      localStorage.setItem('constellation_query_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage preset delete error:', e);
    }
    set(state => ({
      customPresets: updated,
      activePresetId: state.activePresetId === presetId ? null : state.activePresetId,
    }));
  },

  resetSelection: () => {
    set({
      selectedEntityId: null,
      selectedEntity: null,
      selectedRelationshipId: null,
      selectedRelationship: null,
      selectedEventId: null,
      selectedLocationId: null,
      selectedEvidenceId: null,
    });
  },

  // ---------------------------------------------------------------------------
  // Initial Data Bootstrap
  // ---------------------------------------------------------------------------
  fetchInitialData: async () => {
    set({ loading: true, error: null });
    try {
      const [casesRes, activeCaseRes, graphRes, geoRes, timelineRes, evidenceRes, analyticsRes] = await Promise.all([
        api.getCases(),
        api.getCaseById(get().activeCaseId),
        api.getGraph({ caseId: get().activeCaseId }),
        api.getGeoData({ caseId: get().activeCaseId }),
        api.getTimeline({ caseId: get().activeCaseId }),
        api.getEvidence({ caseId: get().activeCaseId }),
        api.getAnalytics(get().activeCaseId),
      ]);

      set({
        cases: casesRes.data || [],
        activeCase: activeCaseRes.data || null,
        graphData: graphRes.data || { nodes: [], links: [] },
        geoData: geoRes.data || { locations: [], arcs: [] },
        timelineEvents: timelineRes.data || [],
        evidenceList: evidenceRes.data || [],
        analyticsData: analyticsRes.data || null,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ---------------------------------------------------------------------------
  // Case Switching
  // ---------------------------------------------------------------------------
  setActiveCase: async (caseId) => {
    if (caseId === get().activeCaseId) return;
    set({ activeCaseId: caseId, loading: true, error: null });
    get().resetSelection();

    try {
      const [caseRes, graphRes, geoRes, timelineRes, evidenceRes, analyticsRes] = await Promise.all([
        api.getCaseById(caseId),
        api.getGraph({ caseId }),
        api.getGeoData({ caseId }),
        api.getTimeline({ caseId }),
        api.getEvidence({ caseId }),
        api.getAnalytics(caseId),
      ]);

      set({
        activeCase: caseRes.data || null,
        graphData: graphRes.data || { nodes: [], links: [] },
        geoData: geoRes.data || { locations: [], arcs: [] },
        timelineEvents: timelineRes.data || [],
        evidenceList: evidenceRes.data || [],
        analyticsData: analyticsRes.data || null,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // ---------------------------------------------------------------------------
  // Canonical Entity Selection & Synchronization
  // ---------------------------------------------------------------------------
  selectEntity: async (entityId) => {
    if (!entityId) {
      get().resetSelection();
      return;
    }

    set({ selectedEntityId: entityId, loading: false });

    try {
      const [detailsRes, relsRes] = await Promise.all([
        api.getEntityById(entityId),
        api.getEntityRelationships(entityId),
      ]);

      const entityObj = detailsRes.data;
      if (entityObj) {
        entityObj.relationships = relsRes.data || [];
      }

      set({
        selectedEntity: entityObj,
        // Also auto-sync associated primary location if exists
        selectedLocationId: entityObj?.locations?.[0]?.id || null,
      });
    } catch (err) {
      console.warn('Failed to fetch full entity details:', err);
    }
  },

  selectRelationship: (rel) => {
    set({
      selectedRelationship: rel,
      selectedRelationshipId: rel ? rel.id : null,
    });
  },

  selectEvent: (eventId) => {
    set({ selectedEventId: eventId });
    const ev = get().timelineEvents.find(e => e.id === eventId);
    if (ev && ev.entityIds && ev.entityIds.length > 0) {
      // Auto-select primary participating entity
      get().selectEntity(ev.entityIds[0]);
    }
  },

  selectLocation: (locationId) => {
    set({ selectedLocationId: locationId });
    const loc = get().geoData.locations.find(l => l.id === locationId);
    if (loc && loc.entityId) {
      get().selectEntity(loc.entityId);
    }
  },

  selectEvidence: (evidenceId) => {
    set({ selectedEvidenceId: evidenceId });
  },

  // ---------------------------------------------------------------------------
  // Graph Reloading with Filters
  // ---------------------------------------------------------------------------
  reloadGraph: async () => {
    const { activeCaseId, filterMinConfidence, filterEntityTypes } = get();
    try {
      const res = await api.getGraph({
        caseId: activeCaseId,
        minConfidence: filterMinConfidence,
        typeFilter: filterEntityTypes.length > 0 ? filterEntityTypes.join(',') : undefined,
      });
      set({ graphData: res.data || { nodes: [], links: [] } });
    } catch (err) {
      console.error('Failed to reload filtered graph:', err);
    }
  },

  // ---------------------------------------------------------------------------
  // Targeted Data Invalidation & Multi-View Synchronization
  // ---------------------------------------------------------------------------
  refreshInvestigationData: async () => {
    const { activeCaseId, filterMinConfidence, filterEntityTypes, selectedEntityId } = get();
    try {
      const [casesRes, activeCaseRes, graphRes, geoRes, timelineRes, evidenceRes, analyticsRes] = await Promise.all([
        api.getCases(),
        api.getCaseById(activeCaseId),
        api.getGraph({
          caseId: activeCaseId,
          minConfidence: filterMinConfidence,
          typeFilter: filterEntityTypes.length > 0 ? filterEntityTypes.join(',') : undefined,
        }),
        api.getGeoData({ caseId: activeCaseId }),
        api.getTimeline({ caseId: activeCaseId }),
        api.getEvidence({ caseId: activeCaseId }),
        api.getAnalytics(activeCaseId),
      ]);

      set({
        cases: casesRes.data || [],
        activeCase: activeCaseRes.data || null,
        graphData: graphRes.data || { nodes: [], links: [] },
        geoData: geoRes.data || { locations: [], arcs: [] },
        timelineEvents: timelineRes.data || [],
        evidenceList: evidenceRes.data || [],
        analyticsData: analyticsRes.data || null,
      });

      if (selectedEntityId) {
        get().selectEntity(selectedEntityId);
      }
    } catch (err) {
      console.error('Targeted refresh error:', err);
    }
  },

  // ---------------------------------------------------------------------------
  // Expand Node Neighborhood
  // ---------------------------------------------------------------------------
  expandNode: async (nodeId, depth = 1) => {
    try {
      const res = await api.expandGraphNode(nodeId, depth);
      const expandedGraph = res.data;
      if (!expandedGraph) return;

      const current = get().graphData;
      const existingNodeIds = new Set(current.nodes.map(n => n.id));
      const existingLinkIds = new Set(current.links.map(l => l.id));

      const newNodes = [...current.nodes];
      for (const node of expandedGraph.nodes) {
        if (!existingNodeIds.has(node.id)) {
          newNodes.push(node);
          existingNodeIds.add(node.id);
        }
      }

      const newLinks = [...current.links];
      for (const link of expandedGraph.links) {
        if (!existingLinkIds.has(link.id)) {
          newLinks.push(link);
          existingLinkIds.add(link.id);
        }
      }

      set({ graphData: { nodes: newNodes, links: newLinks } });
    } catch (err) {
      console.error('Failed to expand node:', err);
    }
  },

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  setSearchQuery: async (query) => {
    set({ searchQuery: query });
    if (!query || query.trim() === '') {
      set({ searchResults: [] });
      return;
    }

    try {
      const res = await api.search(query, { caseId: get().activeCaseId });
      set({ searchResults: res.data || [] });
    } catch (err) {
      console.error('Search failed:', err);
    }
  },

  // ---------------------------------------------------------------------------
  // Cinema Mode Controls
  // ---------------------------------------------------------------------------
  startCinemaMode: () => {
    set({ cinemaPlaying: true, cinemaStep: 0, activeView: 'cinema' });
  },
  stopCinemaMode: () => {
    set({ cinemaPlaying: false, activeView: 'graph' });
  },
  setCinemaStep: (step) => {
    set({ cinemaStep: step });
  },
}));
