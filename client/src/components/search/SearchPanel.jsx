/**
 * CONSTELLATION — Search & Entity Filter Panel
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  Search,
  Filter,
  Users,
  Building,
  Phone,
  Truck,
  DollarSign,
  FileText,
  Sliders,
  ChevronRight,
  Shield,
} from 'lucide-react';

export function SearchPanel() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    selectEntity,
    selectedEntityId,
    activeCase,
    filterMinConfidence,
    setFilterMinConfidence,
    filterEntityTypes,
    toggleEntityTypeFilter,
    clearFilters,
  } = useInvestigationStore();

  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'suspects' | 'filters'

  const entityTypePills = [
    { type: 'suspect', label: 'Suspects', icon: Users },
    { type: 'organization', label: 'Orgs', icon: Building },
    { type: 'phone', label: 'Phones', icon: Phone },
    { type: 'vehicle', label: 'Vehicles', icon: Truck },
    { type: 'transaction', label: 'Finances', icon: DollarSign },
    { type: 'evidence', label: 'Evidence', icon: FileText },
  ];

  return (
    <aside className="glass-panel" style={{
      width: '320px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid var(--border-subtle)',
    }}>
      {/* Search Input Bar */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search suspects, phones, IMEIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
          <button
            onClick={() => setActiveTab('search')}
            className={`btn ${activeTab === 'search' ? 'btn-active' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px' }}
          >
            <Search size={12} />
            <span>Search</span>
          </button>
          <button
            onClick={() => setActiveTab('suspects')}
            className={`btn ${activeTab === 'suspects' ? 'btn-active' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px' }}
          >
            <Shield size={12} />
            <span>Key Targets</span>
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`btn ${activeTab === 'filters' ? 'btn-active' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px' }}
          >
            <Filter size={12} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {activeTab === 'search' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              {searchQuery ? `SEARCH RESULTS (${searchResults.length})` : 'POPULAR INTELLIGENCE TARGETS'}
            </div>

            {searchResults.length === 0 && searchQuery ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No entities found matching "{searchQuery}"
              </div>
            ) : null}

            {/* If no search query, show prompt suggestions */}
            {!searchQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Quick Search Suggestions:
                </div>
                {['Sultan', 'Munshi', 'Blade', '86420904011234', 'Golden Horizon', 'Scorpio'].map(term => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="btn btn-ghost"
                    style={{ justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px' }}
                  >
                    <span>{term}</span>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </button>
                ))}
              </div>
            )}

            {/* Results list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {searchResults.map(ent => {
                const isSelected = selectedEntityId === ent.id;
                return (
                  <div
                    key={ent.id}
                    onClick={() => selectEntity(ent.id)}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className={`badge ${
                        ent.type === 'criminal' ? 'badge-crimson' :
                        ent.type === 'suspect' ? 'badge-gold' :
                        ent.type === 'organization' ? 'badge-cyan' :
                        ent.type === 'phone' ? 'badge-emerald' : 'badge-purple'
                      }`}>
                        {ent.type}
                      </span>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {ent.id}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ent.label}
                    </div>

                    {ent.subType && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {ent.subType}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      <span>Links: {ent.connectionCount || 0}</span>
                      {ent.primaryLocation && <span>📍 {ent.primaryLocation.city}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Suspects Tab */}
        {activeTab === 'suspects' && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              PRIMARY TARGETS IN {activeCase?.id || 'ACTIVE CASE'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(activeCase?.primarySuspectIds || ['PER-SULTAN-01', 'PER-MUNSHI-02', 'PER-BLADE-03']).map(id => {
                const isSelected = selectedEntityId === id;
                return (
                  <div
                    key={id}
                    onClick={() => selectEntity(id)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                      TARGET ID: {id}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                      {id === 'PER-SULTAN-01' ? 'Tariq "Sultan" Mansoor' :
                       id === 'PER-MUNSHI-02' ? 'Karan "Munshi" Verma' :
                       id === 'PER-BLADE-03' ? 'Vikram "Blade" Malhotra' : id}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {id === 'PER-SULTAN-01' ? 'Syndicate Kingpin (Dubai)' :
                       id === 'PER-MUNSHI-02' ? 'Hawala Broker & Financial Bridge' :
                       id === 'PER-BLADE-03' ? 'Armed Logistics & Transport Head' : 'Key Actor'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Confidence Threshold</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {(filterMinConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filterMinConfidence}
                onChange={(e) => setFilterMinConfidence(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>All (0%)</span>
                <span>High (70%)</span>
                <span>Verified (95%+)</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                Entity Type Filters
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {entityTypePills.map(pill => {
                  const Icon = pill.icon;
                  const isSelected = filterEntityTypes.includes(pill.type);
                  return (
                    <button
                      key={pill.type}
                      onClick={() => toggleEntityTypeFilter(pill.type)}
                      className={`btn ${isSelected ? 'btn-active' : 'btn-ghost'}`}
                      style={{ padding: '6px 10px', fontSize: '11px' }}
                    >
                      <Icon size={12} />
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="btn btn-ghost"
              style={{ width: '100%', fontSize: '12px' }}
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
