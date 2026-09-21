/**
 * CONSTELLATION — Graph Topology & Analytics Dashboard
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  Activity,
  GitBranch,
  Network,
  Share2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Search,
  CheckCircle2,
} from 'lucide-react';

export function AnalyticsView() {
  const {
    analyticsData,
    selectEntity,
    setActiveView,
    activeCaseId,
    graphData,
  } = useInvestigationStore();

  const [pathFrom, setPathFrom] = useState('PER-SULTAN-01');
  const [pathTo, setPathTo] = useState('PER-DRIVER-06');
  const [pathResult, setPathResult] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);

  const handleTracePath = async () => {
    if (!pathFrom || !pathTo) return;
    setPathLoading(true);
    try {
      const res = await api.getShortestPath(pathFrom, pathTo, activeCaseId);
      setPathResult(res.data);
    } catch (err) {
      console.error('Failed to compute path:', err);
    } finally {
      setPathLoading(false);
    }
  };

  if (!analyticsData) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading analytical topology computation...
      </div>
    );
  }

  const { summary, centrality, bridgeCandidates, communities, components } = analyticsData;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #0c182c 0%, #07090e 100%)',
    }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Title & Methodology Notice */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              Topological Network Analytics
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Deterministic algorithmic graph metrics identifying information bottlenecks, cut-vertex brokers, and functional sub-clusters.
          </p>
        </div>

        {/* Telemetry Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Network Density', value: `${(summary.networkDensity * 100).toFixed(1)}%`, desc: 'Graph interconnectivity' },
            { label: 'Total Nodes', value: summary.totalNodes, desc: 'Identified actors & entities' },
            { label: 'Total Links', value: summary.totalLinks, desc: 'Corroborated relationships' },
            { label: 'Bridge Candidates', value: summary.bridgeCandidateCount, desc: 'Articulation cut-vertices', color: 'var(--accent-gold)' },
            { label: 'Communities', value: summary.communityCount, desc: 'Partitioned sub-syndicates', color: 'var(--accent-cyan)' },
          ].map((stat, i) => (
            <div key={i} className="glass-panel" style={{ padding: '14px' }}>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color || '#f8fafc', marginTop: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {stat.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Shortest Path Interactive Tool */}
        <div className="glass-panel" style={{ padding: '18px', marginBottom: '24px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <GitBranch size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
              Indirect Connection Path Tracer (BFS Shortest Path)
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>ORIGIN NODE</label>
              <select
                value={pathFrom}
                onChange={(e) => setPathFrom(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  color: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  fontSize: '12px',
                  marginTop: '4px',
                }}
              >
                {graphData.nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.id})</option>
                ))}
              </select>
            </div>

            <ArrowRight size={18} color="var(--accent-cyan)" style={{ marginTop: '16px' }} />

            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>DESTINATION NODE</label>
              <select
                value={pathTo}
                onChange={(e) => setPathTo(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  color: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  fontSize: '12px',
                  marginTop: '4px',
                }}
              >
                {graphData.nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.id})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTracePath}
              className="btn btn-primary"
              disabled={pathLoading}
              style={{ marginTop: '16px', padding: '9px 16px' }}
            >
              {pathLoading ? 'Tracing...' : 'Compute Path'}
            </button>
          </div>

          {/* Path Trace Results */}
          {pathResult && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 242, 254, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-cyan)' }}>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                PATH DISCOVERED: {pathResult.distance} HOP(S) SEPARATION
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {pathResult.nodes.map((n, idx) => (
                  <React.Fragment key={n.id}>
                    <button
                      onClick={() => {
                        selectEntity(n.id);
                        setActiveView('graph');
                      }}
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)' }}
                    >
                      {n.label}
                    </button>
                    {idx < pathResult.nodes.length - 1 && (
                      <ArrowRight size={14} color="var(--accent-gold)" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Centrality & Bridge Candidates Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
          {/* Bridge Candidates (Betweenness Centrality) */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <ShieldAlert size={16} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                Top Bridge Candidates (Betweenness Centrality)
              </h3>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Nodes controlling communication flow between separate subgraphs. Interdicting these nodes fragments the network.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {centrality.betweenness.slice(0, 5).map((item, idx) => (
                <div
                  key={item.entity?.id || idx}
                  onClick={() => {
                    if (item.entity) {
                      selectEntity(item.entity.id);
                      setActiveView('graph');
                    }
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: item.isArticulationPoint ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: item.isArticulationPoint ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                      #{idx + 1} {item.entity?.label}
                    </div>
                    {item.isArticulationPoint && (
                      <span className="badge badge-gold">CRITICAL CUT-VERTEX</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Type: {item.entity?.type} // ID: {item.entity?.id}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <span>Betweenness Score: <strong>{item.normalized}</strong></span>
                    <span>Raw Shortest Paths: <strong>{item.score}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* High Connectivity Nodes (Degree Centrality) */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <TrendingUp size={16} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                High Connectivity Nodes (Degree Centrality)
              </h3>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Actors possessing the highest volume of verified direct links and associations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {centrality.degree.slice(0, 5).map((item, idx) => (
                <div
                  key={item.entity?.id || idx}
                  onClick={() => {
                    if (item.entity) {
                      selectEntity(item.entity.id);
                      setActiveView('graph');
                    }
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                      #{idx + 1} {item.entity?.label}
                    </div>
                    <span className="badge badge-cyan">
                      {item.score} DIRECT LINKS
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Type: {item.entity?.type} // Normalized: {(item.normalized * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
