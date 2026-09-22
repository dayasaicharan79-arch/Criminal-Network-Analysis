/**
 * CONSTELLATION — Entity Intelligence Dossier Panel
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  User,
  ShieldAlert,
  Share2,
  Globe,
  Clock,
  FileText,
  Bot,
  ExternalLink,
  PlusCircle,
  X,
  AlertTriangle,
  Fingerprint,
  Printer,
} from 'lucide-react';

export function EntityDetailPanel() {
  const {
    selectedEntity,
    selectEntity,
    resetSelection,
    expandNode,
    setActiveView,
    selectLocation,
    selectEvent,
    selectEvidence,
    openReportModal,
  } = useInvestigationStore();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'relationships' | 'timeline' | 'geo' | 'evidence'

  if (!selectedEntity) {
    return (
      <aside className="glass-panel" style={{
        width: '360px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        borderLeft: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed var(--border-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <Fingerprint size={28} color="var(--text-muted)" />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
          No Target Selected
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', maxWidth: '240px' }}>
          Select an entity node in the 3D Graph, click on a map coordinate, or search in the left panel to inspect full forensic intelligence.
        </div>
      </aside>
    );
  }

  const attributes = selectedEntity.attributes || {};
  const rels = selectedEntity.relationships || [];
  const events = selectedEntity.events || [];
  const locations = selectedEntity.locations || [];
  const evidence = selectedEntity.evidence || [];

  return (
    <aside className="glass-panel" style={{
      width: '380px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderLeft: '1px solid var(--border-subtle)',
    }}>
      {/* Dossier Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
        <button
          onClick={resetSelection}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className={`badge ${
            selectedEntity.type === 'criminal' ? 'badge-crimson' :
            selectedEntity.type === 'suspect' ? 'badge-gold' :
            selectedEntity.type === 'organization' ? 'badge-cyan' :
            selectedEntity.type === 'phone' ? 'badge-emerald' : 'badge-purple'
          }`}>
            {selectedEntity.type}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            {(selectedEntity.confidence * 100).toFixed(0)}% CONFIDENCE
          </span>
        </div>

        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px' }}>
          {selectedEntity.label}
        </div>

        {selectedEntity.subType && (
          <div style={{ fontSize: '12px', color: 'var(--accent-gold)', marginTop: '2px', fontWeight: 500 }}>
            {selectedEntity.subType}
          </div>
        )}

        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '6px' }}>
          ID: {selectedEntity.id} // SOURCE: {selectedEntity.source || 'RECORD'}
        </div>

        {/* Quick Action Toolbar */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
          <button
            onClick={() => expandNode(selectedEntity.id, 1)}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
            title="Expand 1 hop in 3D graph"
          >
            <PlusCircle size={13} color="var(--accent-cyan)" />
            <span>Expand</span>
          </button>
          <button
            onClick={() => {
              setActiveView('geo');
            }}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
            title="Focus entity on 3D Globe"
          >
            <Globe size={13} color="var(--accent-cyan)" />
            <span>Globe</span>
          </button>
          <button
            onClick={() => {
              setActiveView('sherlock');
            }}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
            title="Ask Sherlock AI about this entity"
          >
            <Bot size={13} color="var(--accent-purple)" />
            <span>Sherlock</span>
          </button>
          <button
            onClick={() => openReportModal({ mode: 'entity', entityId: selectedEntity.id })}
            className="btn btn-ghost"
            style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
            title="Print Intelligence Profile for this entity"
          >
            <Printer size={13} color="var(--accent-gold)" />
            <span>Print Dossier</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '2px', marginTop: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'overview', label: 'Dossier' },
            { id: 'relationships', label: `Links (${rels.length})` },
            { id: 'timeline', label: `Events (${events.length})` },
            { id: 'geo', label: `Geo (${locations.length})` },
            { id: 'evidence', label: `Evid (${evidence.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '6px 2px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              RECORD ATTRIBUTES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(attributes).map(([key, val]) => (
                <div
                  key={key}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              DIRECT NETWORK ASSOCIATIONS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rels.map(r => (
                <div
                  key={r.id}
                  onClick={() => r.connectedEntity && selectEntity(r.connectedEntity.id)}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>{r.type}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(r.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginTop: '3px' }}>
                    {r.connectedEntity?.label || r.target}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    Provenance: {r.provenance}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Events Tab */}
        {activeTab === 'timeline' && (
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              CHRONOLOGICAL OCCURRENCES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => selectEvent(ev.id)}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                    {new Date(ev.timestamp).toUTCString()}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {ev.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geospatial Tab */}
        {activeTab === 'geo' && (
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              RECORDED GEOGRAPHIC SITES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {locations.map(loc => (
                <div
                  key={loc.id}
                  onClick={() => {
                    selectLocation(loc.id);
                    setActiveView('geo');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    <span>{loc.city}, {loc.country}</span>
                    <Globe size={13} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {loc.name}
                  </div>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '4px' }}>
                    [{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}] • {loc.locationType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Tab */}
        {activeTab === 'evidence' && (
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px' }}>
              CORROBORATING FORENSIC EVIDENCE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {evidence.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => selectEvidence(ev.id)}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-emerald">{ev.classification}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {ev.evidenceType}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    HASH: {ev.hash.substring(0, 20)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
