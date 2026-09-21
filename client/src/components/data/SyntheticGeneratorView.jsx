/**
 * CONSTELLATION — Synthetic Intelligence Scenario Generator Component
 *
 * Implements investigative controls for generating coherent fictional scenarios:
 * - Scenario A: Organized Syndicate
 * - Scenario B: Communication Network
 * - Scenario C: Multi-Location Investigation
 * - Scenario D: Transaction Network
 * - Scenario E: Cross-Case Investigation
 * - Scenario F: Large Network Stress Test
 *
 * Direct integration into canonical Ingestion Pipeline (POST /api/ingest/synthetic/generate).
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  Sparkles,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Network,
  PhoneCall,
  Globe,
  DollarSign,
  Briefcase,
  Cpu,
} from 'lucide-react';

const SCENARIOS = [
  {
    id: 'SCENARIO_A',
    name: 'Scenario A — Organized Syndicate',
    icon: Network,
    badge: 'CENTRALITY',
    description: 'Hierarchical crime syndicate with Kingpin, lieutenants, hawaladars, logistics cutouts, and front companies.',
    focus: 'Degree centrality, bridge nodes, community clustering.',
  },
  {
    id: 'SCENARIO_B',
    name: 'Scenario B — Communication Network',
    icon: PhoneCall,
    badge: 'TELECOM',
    description: 'Burner phone fleet with high-frequency call bursts, encrypted VoIP matrix relays, and shared hardware IMEI anomalies.',
    focus: 'Shared hardware identifiers, burst calls, burner clusters.',
  },
  {
    id: 'SCENARIO_C',
    name: 'Scenario C — Multi-Location Investigation',
    icon: Globe,
    badge: 'GEOSPATIAL',
    description: 'Inter-state and international operational movement across Delhi, Mumbai, Dubai, Kandla, Bengaluru, and Ahmedabad.',
    focus: 'Geographic clusters, transit hubs, movement timeline routes.',
  },
  {
    id: 'SCENARIO_D',
    name: 'Scenario D — Transaction Network',
    icon: DollarSign,
    badge: 'FINANCIAL',
    description: 'Complex financial layering network using Hawala tokens, rural cooperative mule accounts, and crypto OTC wash counters.',
    focus: 'Financial flow chains, mule rings, layering topology.',
  },
  {
    id: 'SCENARIO_E',
    name: 'Scenario E — Cross-Case Investigation',
    icon: Briefcase,
    badge: 'CROSS-CASE',
    description: 'Multi-FIR investigation uncovering common suspects, burner phones, and safehouses shared between independent active cases.',
    focus: 'Cross-case linkages, shared target dossiers, cold cases.',
  },
  {
    id: 'SCENARIO_F',
    name: 'Scenario F — Large Network Stress Test',
    icon: Cpu,
    badge: 'STRESS TEST',
    description: 'Scalable parametric network designed for performance, betweenness centrality, and 3D graph layout stress testing.',
    focus: 'High scale, algorithmic stress, complex topology.',
  },
];

const PRESETS = [
  { id: 'SMALL', label: 'Small Cell', entities: 20, desc: '~20 entities, ~25 links' },
  { id: 'MEDIUM', label: 'Medium Syndicate', entities: 50, desc: '~50 entities, ~70 links' },
  { id: 'LARGE', label: 'Large Network', entities: 120, desc: '~120 entities, ~180 links' },
  { id: 'STRESS_TEST', label: 'Stress Test', entities: 300, desc: '~300 entities, ~450 links' },
];

export function SyntheticGeneratorView() {
  const { activeCaseId, refreshInvestigationData, selectEntity } = useInvestigationStore();

  const [selectedScenario, setSelectedScenario] = useState('SCENARIO_A');
  const [selectedPreset, setSelectedPreset] = useState('MEDIUM');
  const [density, setDensity] = useState(1.0);
  const [customEntities, setCustomEntities] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handlePresetSelect = (presetId) => {
    setSelectedPreset(presetId);
    const p = PRESETS.find(x => x.id === presetId);
    if (p) setCustomEntities(p.entities);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMessage(null);
    setResult(null);

    try {
      const res = await api.generateSynthetic({
        scenario: selectedScenario,
        preset: selectedPreset,
        entityCount: customEntities,
        caseId: activeCaseId,
        density,
      });

      if (res.data.success) {
        setResult(res.data);
        setStatusMessage({
          type: 'success',
          text: `Successfully generated and ingested ${res.data.summary.accepted} synthetic intelligence records (Batch: ${res.data.batchId}) into the real knowledge graph pipeline!`,
        });

        // Trigger real pipeline workspace refresh
        await refreshInvestigationData();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Synthetic generation failed',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Synthetic Intelligence Scenario Generator
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Generate structured fictional scenarios with planted investigative anomalies, bridge nodes, and analytical patterns
          </div>
        </div>
        <div className="badge badge-gold" style={{ fontSize: '10px' }}>
          PROVENANCE: SYNTHETIC / DEMONSTRATION DATA
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${statusMessage.type === 'error' ? 'var(--accent-crimson)' : 'var(--accent-emerald)'}`,
          color: statusMessage.type === 'error' ? '#fca5a5' : '#86efac',
        }}>
          {statusMessage.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Scenarios Grid */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
          1. Select Coherent Investigation Scenario
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px',
        }}>
          {SCENARIOS.map(sc => {
            const Icon = sc.icon;
            const isSelected = selectedScenario === sc.id;

            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenario(sc.id)}
                style={{
                  padding: '12px',
                  background: isSelected ? 'rgba(0, 242, 254, 0.1)' : 'rgba(0,0,0,0.3)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} color={isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#fff' : 'var(--text-primary)' }}>
                      {sc.name.split('—')[1] || sc.name}
                    </span>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '9px' }}>
                    {sc.badge}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {sc.description}
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Analytical Focus: {sc.focus}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preset Controls */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
          2. Select Scale Preset & Network Parameters
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {PRESETS.map(p => {
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id)}
                className={`btn ${isSelected ? 'btn-active' : 'btn-ghost'}`}
                style={{
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700 }}>{p.label}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {p.desc}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
          padding: '12px',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>Target Entity Count</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>{customEntities} Nodes</strong>
            </div>
            <input
              type="range"
              min="15"
              max="400"
              step="5"
              value={customEntities}
              onChange={e => setCustomEntities(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>Network Density Multiplier</span>
              <strong style={{ color: 'var(--accent-gold)' }}>{density}x</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={density}
              onChange={e => setDensity(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-gold)' }}
            />
          </div>
        </div>
      </div>

      {/* Generation Trigger Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: '13px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
            color: '#07090e',
            fontWeight: 800,
            letterSpacing: '0.5px',
          }}
        >
          <Sparkles size={16} />
          {generating ? 'Generating & Ingesting Pipeline...' : 'Generate & Ingest Intelligence'}
        </button>
      </div>

      {/* Ingestion Result Summary */}
      {result && (
        <div style={{
          padding: '12px',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--accent-cyan)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              Ingestion Provenance Batch: {result.batchId}
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
              SUCCESSFULLY COMMITTED
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}>
            <div>Accepted: <strong style={{ color: 'var(--accent-emerald)' }}>{result.summary?.accepted}</strong></div>
            <div>Entities: <strong>{result.summary?.entitiesCreated}</strong></div>
            <div>Merged: <strong style={{ color: 'var(--accent-gold)' }}>{result.summary?.entitiesMerged}</strong></div>
            <div>Relationships: <strong>{result.summary?.relationshipsCreated}</strong></div>
            <div>Locations: <strong>{result.summary?.locationsCreated}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SyntheticGeneratorView;
