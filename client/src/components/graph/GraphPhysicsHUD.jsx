/**
 * CONSTELLATION — 3D Graph Physics & Community Clustering Tuning HUD
 *
 * Provides real-time analyst controls for:
 * - Electrostatic Charge / Repulsion Strength
 * - Link Spring Rest Distance
 * - 3D Collision / Exclusion Bubble Radius
 * - Velocity Decay / Simulation Damping
 * - Community Centroid Clustering Anchors
 * - Simulation Reheat & Parameter Reset
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  Sliders,
  Flame,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity,
  Boxes,
  Zap,
  X,
} from 'lucide-react';

export function GraphPhysicsHUD({ isOpen = true, onClose, onReheat }) {
  const { graphPhysics, setGraphPhysics, resetGraphPhysics } = useInvestigationStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isOpen) return null;

  const handleSliderChange = (key, value) => {
    setGraphPhysics({ [key]: value });
    if (onReheat) onReheat();
  };

  const handleReset = () => {
    resetGraphPhysics();
    if (onReheat) onReheat();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 25,
        maxWidth: '320px',
        width: isExpanded ? '300px' : 'auto',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '8px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-medium)',
        }}
      >
        {/* Header Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            userSelect: 'none',
          }}
        >
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', cursor: 'pointer', flex: 1 }}
          >
            <Sliders size={13} />
            <span>GRAPH PHYSICS & CLUSTERING</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {graphPhysics.communityAnchors && (
              <span className="badge badge-purple" style={{ fontSize: '8px', padding: '1px 4px' }}>
                CLUSTERED
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
              title={isExpanded ? 'Collapse controls' : 'Expand controls'}
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close Physics HUD"
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Tuning Controls */}
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            {/* 1. Charge Repulsion */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>REPULSION (CHARGE):</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{graphPhysics.chargeStrength}</strong>
              </div>
              <input
                type="range"
                min="-600"
                max="-30"
                step="10"
                value={graphPhysics.chargeStrength}
                onChange={(e) => handleSliderChange('chargeStrength', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                Electrostatic repulsion between nodes
              </div>
            </div>

            {/* 2. Link Spring Distance */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>SPRING DISTANCE:</span>
                <strong style={{ color: 'var(--accent-gold)' }}>{graphPhysics.linkDistance}px</strong>
              </div>
              <input
                type="range"
                min="15"
                max="150"
                step="5"
                value={graphPhysics.linkDistance}
                onChange={(e) => handleSliderChange('linkDistance', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                Rest length of relationship spring links
              </div>
            </div>

            {/* 3. Collision Radius */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>COLLISION BUBBLE:</span>
                <strong style={{ color: graphPhysics.collisionRadius > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {graphPhysics.collisionRadius > 0 ? `${graphPhysics.collisionRadius}px` : 'DISABLED'}
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={graphPhysics.collisionRadius}
                onChange={(e) => handleSliderChange('collisionRadius', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                Anti-overlap exclusion radius preventing node collisions
              </div>
            </div>

            {/* 4. Velocity Decay (Damping) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>DAMPING / STABILITY:</span>
                <strong style={{ color: 'var(--accent-purple)' }}>{graphPhysics.velocityDecay.toFixed(2)}</strong>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={graphPhysics.velocityDecay}
                onChange={(e) => handleSliderChange('velocityDecay', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                Kinetic friction; higher values stabilize simulation faster
              </div>
            </div>

            {/* 5. Community Clustering Anchors Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Boxes size={13} color="var(--accent-purple)" />
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>Community Anchors</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Cluster nodes by topological community</div>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={graphPhysics.communityAnchors}
                  onChange={(e) => handleSliderChange('communityAnchors', e.target.checked)}
                  style={{ accentColor: 'var(--accent-purple)', transform: 'scale(1.15)' }}
                />
              </label>
            </div>

            {/* Action Buttons: Reheat & Reset */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={onReheat}
                className="btn btn-primary"
                style={{ flex: 1, padding: '5px 10px', fontSize: '10px', background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)', color: '#07090e' }}
                title="Reheat simulation alpha"
              >
                <Flame size={12} /> Reheat
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost"
                style={{ flex: 1, padding: '5px 10px', fontSize: '10px' }}
                title="Reset to default physics"
              >
                <RotateCcw size={12} /> Defaults
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GraphPhysicsHUD;
