/**
 * CONSTELLATION — Chronological Investigation Timeline Matrix
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  Clock,
  Filter,
  PhoneCall,
  DollarSign,
  AlertOctagon,
  Shield,
  FileText,
  MapPin,
  ExternalLink,
  ChevronRight,
  Eye,
} from 'lucide-react';

const EVENT_TYPE_CONFIG = {
  CRIME: { color: '#ef4444', icon: AlertOctagon, label: 'Crime Incident' },
  COMMUNICATION: { color: '#00f2fe', icon: PhoneCall, label: 'Comms Intercept' },
  CALL: { color: '#00f2fe', icon: PhoneCall, label: 'Phone Call' },
  TRANSACTION: { color: '#f59e0b', icon: DollarSign, label: 'Financial Movement' },
  MEETING: { color: '#a855f7', icon: Shield, label: 'Physical Rendezvous' },
  RAID_SEIZURE: { color: '#ef4444', icon: Shield, label: 'Tactical Raid' },
  FIR_REGISTERED: { color: '#f97316', icon: FileText, label: 'FIR Registration' },
  LOCATION_VISIT: { color: '#10b981', icon: MapPin, label: 'Location Tracking' },
};

export function TimelineView() {
  const {
    timelineEvents,
    selectedEventId,
    selectEvent,
    selectEntity,
    selectEvidence,
    selectLocation,
    setActiveView,
    timelinePlayback,
    setTimelinePlayback,
  } = useInvestigationStore();

  const [filterType, setFilterType] = useState('ALL');

  const filteredEvents = filterType === 'ALL'
    ? timelineEvents
    : timelineEvents.filter(e => e.eventType === filterType);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #0d1527 0%, #07090e 100%)',
    }}>
      {/* Header & Filter Controls */}
      <div style={{ maxWidth: '900px', margin: '0 auto', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
                Operational Chronology & Event Matrix
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Correlated temporal sequence reconstructed from CDR triangulation, bank settlement logs, and raid reports.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'COMMUNICATION', 'TRANSACTION', 'MEETING', 'RAID_SEIZURE', 'LOCATION_VISIT'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`btn ${filterType === type ? 'btn-active' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11px', textTransform: 'capitalize' }}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
        {/* Central Vertical Timeline Spine */}
        <div style={{
          position: 'absolute',
          top: '8px',
          bottom: '8px',
          left: '28px',
          width: '2px',
          background: 'linear-gradient(180deg, #00f2fe 0%, #3b82f6 50%, #f59e0b 100%)',
          opacity: 0.3,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredEvents.map((ev, idx) => {
            const isSelected = selectedEventId === ev.id;
            const isCurrentPlayback = timelinePlayback.currentTime === ev.timestamp;
            const config = EVENT_TYPE_CONFIG[ev.eventType] || { color: '#94a3b8', icon: Clock, label: ev.eventType };
            const Icon = config.icon;

            return (
              <div
                key={ev.id}
                onClick={() => selectEvent(ev.id)}
                style={{
                  display: 'flex',
                  gap: '20px',
                  alignItems: 'flex-start',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                {/* Node Milestone Indicator */}
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: isCurrentPlayback ? '#00f2fe' : isSelected ? config.color : 'var(--bg-surface-elevated)',
                  border: `2px solid ${isCurrentPlayback ? '#00f2fe' : config.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrentPlayback ? '0 0 20px #00f2fe' : isSelected ? `0 0 16px ${config.color}` : 'none',
                  zIndex: 2,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}>
                  <Icon size={18} color={isCurrentPlayback || isSelected ? '#07090e' : config.color} />
                </div>

                {/* Event Card Content */}
                <div
                  className="glass-panel"
                  style={{
                    flex: 1,
                    padding: '16px',
                    border: isCurrentPlayback ? '1px solid #00f2fe' : isSelected ? `1px solid ${config.color}` : '1px solid var(--border-subtle)',
                    background: isCurrentPlayback ? 'rgba(0, 240, 255, 0.12)' : isSelected ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-surface-glass)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: isCurrentPlayback ? '0 0 24px rgba(0, 240, 255, 0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge" style={{ backgroundColor: `${config.color}22`, color: config.color, border: `1px solid ${config.color}55` }}>
                        {config.label}
                      </span>
                      <span className="badge badge-emerald">
                        {ev.classification || 'FACT'}
                      </span>
                      {ev.severity === 'CRITICAL' && (
                        <span className="badge badge-crimson">CRITICAL SEVERITY</span>
                      )}
                      {isCurrentPlayback && (
                        <span className="badge" style={{ background: 'rgba(0, 240, 255, 0.2)', color: '#00f2fe', border: '1px solid #00f2fe' }}>
                          PLAYBACK SYNC
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                      {new Date(ev.timestamp).toUTCString()}
                    </div>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '8px' }}>
                    {ev.title}
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                    {ev.description}
                  </div>

                  {/* Contextual Badges: Location & Entities */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    {ev.locationName && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ev.locationId) {
                            selectLocation(ev.locationId);
                            setActiveView('geo');
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                      >
                        <MapPin size={12} />
                        <span>{ev.locationName}</span>
                      </div>
                    )}

                    {ev.entityIds && ev.entityIds.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Target Actors:</span>
                        {ev.entityIds.map(eId => (
                          <span
                            key={eId}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectEntity(eId);
                            }}
                            className="badge badge-purple"
                            style={{ cursor: 'pointer' }}
                          >
                            {eId}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* View in 3D Graph Trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEvent(ev.id);
                        setTimelinePlayback({
                          currentTime: ev.timestamp,
                          activeEventIndex: timelineEvents.findIndex(t => t.id === ev.id),
                        });
                        setActiveView('graph');
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '10px', marginLeft: 'auto', color: 'var(--accent-cyan)' }}
                    >
                      <span>Focus on 3D Graph</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
