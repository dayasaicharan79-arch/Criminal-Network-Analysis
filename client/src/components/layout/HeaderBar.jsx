/**
 * CONSTELLATION — Header Bar & Global Navigation
 */
import React from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  Share2,
  Globe,
  Clock,
  Activity,
  ShieldCheck,
  Bot,
  Zap,
  Eye,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';

export function HeaderBar() {
  const {
    activeView,
    setActiveView,
    activeCaseId,
    setActiveCase,
    cases,
    graphData,
    geoData,
    timelineEvents,
    evidenceList,
    resetSelection,
    startCinemaMode,
  } = useInvestigationStore();

  const navItems = [
    { id: 'graph', label: '3D Graph', icon: Share2 },
    { id: 'geo', label: 'Geospatial', icon: Globe },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'evidence', label: 'Evidence', icon: ShieldCheck },
    { id: 'sherlock', label: 'Sherlock AI', icon: Bot },
    { id: 'moriarty', label: 'Moriarty', icon: Zap },
  ];

  return (
    <header className="glass-panel" style={{
      margin: '8px 8px 0 8px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      zIndex: 100,
    }}>
      {/* Brand & Classification */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(0, 242, 254, 0.4)',
          }}>
            <Share2 size={16} color="#07090e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '1px',
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(90deg, #ffffff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              CONSTELLATION
            </div>
            <div style={{
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
            }}>
              INTELLIGENCE OS v2.0
            </div>
          </div>
        </div>

        <div className="badge badge-crimson" style={{ fontSize: '10px', padding: '2px 6px' }}>
          <ShieldAlert size={10} /> RESTRICTED // LAW ENFORCEMENT
        </div>
      </div>

      {/* Active Case Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          CASE:
        </label>
        <select
          value={activeCaseId}
          onChange={(e) => setActiveCase(e.target.value)}
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            color: 'var(--accent-cyan)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {cases.map(c => (
            <option key={c.id} value={c.id} style={{ background: '#0e131f', color: '#f8fafc' }}>
              {c.id} — {c.title.split('—')[0]}
            </option>
          ))}
        </select>
      </div>

      {/* View Switcher Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`btn ${isActive ? 'btn-active' : 'btn-ghost'}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: isActive ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
              }}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* God's Eye Cinema Mode Launcher */}
        <button
          onClick={startCinemaMode}
          className="btn"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            color: '#fef08a',
            padding: '6px 12px',
            fontSize: '12px',
            borderRadius: '6px',
            fontWeight: 600,
          }}
          title="Start God's Eye Guided Case Tour"
        >
          <Eye size={14} />
          <span>Investigation Mode</span>
        </button>
      </nav>

      {/* Quick Telemetry & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          background: 'rgba(0,0,0,0.2)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
        }}>
          <span>NODES: <strong style={{ color: 'var(--accent-cyan)' }}>{graphData.nodes.length}</strong></span>
          <span>LINKS: <strong style={{ color: 'var(--text-primary)' }}>{graphData.links.length}</strong></span>
          <span>EVENTS: <strong style={{ color: 'var(--accent-gold)' }}>{timelineEvents.length}</strong></span>
          <span>EVID: <strong style={{ color: 'var(--accent-emerald)' }}>{evidenceList.length}</strong></span>
        </div>

        <button
          onClick={resetSelection}
          className="btn btn-ghost"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          title="Clear active entity/event selection"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
}
