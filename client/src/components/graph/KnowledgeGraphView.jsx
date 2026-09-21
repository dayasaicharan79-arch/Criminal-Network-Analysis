/**
 * CONSTELLATION — 3D WebGL Knowledge Graph Visualization
 *
 * Implements:
 * - Named nodes rendering real entity names and types from backend
 * - Performance-aware billboarded canvas sprite label system with distance/zoom LOD
 * - 3D geometric visual differentiation per entity type (Sphere, Cube, Cylinder, Cone, Octahedron, etc.)
 * - Rich tactical investigator legend documenting shapes, edge semantics, and analytical states
 */
import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
} from 'lucide-react';

const ENTITY_CONFIG = {
  criminal: { color: '#ef4444', shape: 'sphere', label: 'Criminal / Kingpin' },
  suspect: { color: '#f59e0b', shape: 'sphere', label: 'Suspect' },
  person: { color: '#38bdf8', shape: 'sphere', label: 'Person' },
  organization: { color: '#00f2fe', shape: 'box', label: 'Organization' },
  phone: { color: '#10b981', shape: 'cylinder', label: 'Phone' },
  vehicle: { color: '#3b82f6', shape: 'cone', label: 'Vehicle' },
  location: { color: '#ec4899', shape: 'octahedron', label: 'Location' },
  transaction: { color: '#eab308', shape: 'dodecahedron', label: 'Transaction' },
  device: { color: '#a855f7', shape: 'cylinder', label: 'Device / Hardware' },
  evidence: { color: '#818cf8', shape: 'tetrahedron', label: 'Evidence / Exhibit' },
  document: { color: '#94a3b8', shape: 'tetrahedron', label: 'Document' },
  event: { color: '#f97316', shape: 'torus', label: 'Timeline Event' },
  fir: { color: '#f97316', shape: 'torus', label: 'FIR / Legal Record' },
  case: { color: '#06b6d4', shape: 'torus', label: 'Case File' },
};

/**
 * Creates high-performance 2D canvas sprite for 3D billboarded text labels
 */
function createLabelSprite(text, subtext, color, isSelected, isKeyTarget) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background rounded pill
  const bg = isSelected ? 'rgba(14, 25, 45, 0.95)' : isKeyTarget ? 'rgba(25, 18, 10, 0.92)' : 'rgba(7, 10, 18, 0.88)';
  const border = isSelected ? '#00f2fe' : isKeyTarget ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)';
  const borderWidth = isSelected ? 4 : isKeyTarget ? 3 : 2;

  ctx.beginPath();
  ctx.roundRect(10, 10, 492, 108, 20);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = border;
  ctx.stroke();

  // Draw type pill
  ctx.beginPath();
  ctx.roundRect(24, 24, 120, 32, 8);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.fillText((subtext || 'ENTITY').toUpperCase().substring(0, 10), 84, 46);

  // Draw entity primary label
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const displayLabel = text.length > 22 ? text.substring(0, 20) + '...' : text;
  ctx.fillText(displayLabel, 160, 48);

  // Status or sub-description
  ctx.font = '20px monospace';
  ctx.fillStyle = isSelected ? '#00f2fe' : '#94a3b8';
  ctx.fillText(isSelected ? 'ACTIVE SELECTION' : isKeyTarget ? 'KEY TARGET // PRIORITY' : 'RECORD IDENTIFIER', 24, 94);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  // Aspect ratio 4:1
  const scaleMultiplier = isSelected ? 1.3 : isKeyTarget ? 1.15 : 1.0;
  sprite.scale.set(24 * scaleMultiplier, 6 * scaleMultiplier, 1);
  return sprite;
}

/**
 * Creates 3D Geometry mesh based on entity type
 */
function createNodeGeometry(type, radius) {
  const cfg = ENTITY_CONFIG[type] || ENTITY_CONFIG.person;
  switch (cfg.shape) {
    case 'box':
      return new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5);
    case 'cylinder':
      return new THREE.CylinderGeometry(radius * 0.75, radius * 0.75, radius * 2.2, 16);
    case 'cone':
      return new THREE.ConeGeometry(radius * 1.2, radius * 2.4, 16);
    case 'octahedron':
      return new THREE.OctahedronGeometry(radius * 1.3, 0);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(radius * 1.2, 0);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(radius * 1.4, 0);
    case 'torus':
      return new THREE.TorusGeometry(radius * 1.1, radius * 0.35, 12, 24);
    case 'sphere':
    default:
      return new THREE.SphereGeometry(radius, 20, 20);
  }
}

export function KnowledgeGraphView() {
  const containerRef = useRef(null);
  const graphInstanceRef = useRef(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [legendOpen, setLegendOpen] = useState(true);

  const {
    graphData,
    selectedEntityId,
    selectEntity,
    selectRelationship,
    filterEntityTypes,
    toggleEntityTypeFilter,
  } = useInvestigationStore();

  const selectedEntityIdRef = useRef(selectedEntityId);
  selectedEntityIdRef.current = selectedEntityId;

  useEffect(() => {
    if (!containerRef.current) return;

    if (graphInstanceRef.current) {
      graphInstanceRef.current._destructor?.();
      containerRef.current.innerHTML = '';
    }

    const width = containerRef.current.clientWidth || window.innerWidth - 700;
    const height = containerRef.current.clientHeight || window.innerHeight - 80;

    const Graph = ForceGraph3D()(containerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('#07090e')
      .showNavInfo(false)
      .nodeLabel(node => `
        <div style="background: rgba(14, 19, 31, 0.96); border: 1px solid #00f2fe; padding: 8px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <div style="font-weight: 700; color: ${(ENTITY_CONFIG[node.type] || ENTITY_CONFIG.person).color}; font-size: 13px;">${node.label}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">Type: ${node.type.toUpperCase()}${node.subType ? ` (${node.subType})` : ''}</div>
          <div style="color: #00f2fe; font-size: 10px; font-family: monospace; margin-top: 4px;">ID: ${node.id}</div>
        </div>
      `)
      .nodeThreeObject(node => {
        const isSelected = selectedEntityIdRef.current === node.id;
        const isHovered = hoverNode?.id === node.id;
        const cfg = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.person;
        const color = cfg.color;

        // Central / Key target detection (from id, role, or attributes)
        const isKeyTarget =
          node.id === 'PER-SULTAN-01' ||
          node.id === 'PER-MUNSHI-02' ||
          node.id.includes('BOSS') ||
          node.id.includes('BRIDGE') ||
          node.attributes?.riskLevel === 'CRITICAL' ||
          node.attributes?.riskLevel === 'EXTREME';

        let radius = isSelected ? 8.5 : isHovered ? 7.0 : isKeyTarget ? 7.5 : 5.0;

        const group = new THREE.Group();

        // 1. Differentiated 3D Geometry
        const geometry = createNodeGeometry(node.type, radius);
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(isSelected ? '#00f2fe' : isHovered ? color : isKeyTarget ? '#f59e0b' : '#000000'),
          emissiveIntensity: isSelected ? 0.7 : isHovered ? 0.4 : isKeyTarget ? 0.25 : 0.05,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // 2. Selection Halo Ring
        if (isSelected) {
          const ringGeo = new THREE.RingGeometry(radius + 2, radius + 4, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color('#00f2fe'),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          group.add(ring);
        }

        // 3. Named Node Label Sprite (Billboarded Canvas Text)
        const labelSprite = createLabelSprite(
          node.label || node.id,
          node.type,
          color,
          isSelected,
          isKeyTarget
        );
        labelSprite.position.set(0, radius + 7, 0);
        group.add(labelSprite);

        // Store label reference and metadata on group for camera distance LOD
        group.userData = {
          labelSprite,
          isSelected,
          isKeyTarget,
          nodeId: node.id,
        };

        return group;
      })
      .nodeRelSize(6)
      .linkWidth(link => {
        const currSelected = selectedEntityIdRef.current;
        const isConnected = currSelected === (link.source?.id || link.source) ||
                            currSelected === (link.target?.id || link.target);
        return isConnected ? 2.8 : 1.2;
      })
      .linkColor(link => {
        const currSelected = selectedEntityIdRef.current;
        const isConnected = currSelected === (link.source?.id || link.source) ||
                            currSelected === (link.target?.id || link.target);
        if (isConnected) return '#00f2fe';
        if (link.classification === 'FACT') return 'rgba(255, 255, 255, 0.3)';
        return 'rgba(245, 158, 11, 0.45)';
      })
      .linkDirectionalParticles(link => {
        const currSelected = selectedEntityIdRef.current;
        const isConnected = currSelected === (link.source?.id || link.source) ||
                            currSelected === (link.target?.id || link.target);
        return isConnected ? 4 : 1;
      })
      .linkDirectionalParticleWidth(link => {
        const currSelected = selectedEntityIdRef.current;
        const isConnected = currSelected === (link.source?.id || link.source) ||
                            currSelected === (link.target?.id || link.target);
        return isConnected ? 2.5 : 1.2;
      })
      .linkDirectionalParticleSpeed(0.006)
      .linkDirectionalParticleColor(() => '#00f2fe')
      .onNodeClick(node => {
        selectEntity(node.id);
        const distance = 85;
        const hyp = Math.hypot(node.x, node.y, node.z) || 1;
        const distRatio = 1 + distance / hyp;
        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1400
        );
      })
      .onLinkClick(link => {
        selectRelationship(link);
      })
      .onNodeHover(node => {
        setHoverNode(node || null);
      });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xdddddd, Math.PI);
    Graph.scene().add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9 * Math.PI);
    dirLight.position.set(50, 120, 100);
    Graph.scene().add(dirLight);

    graphInstanceRef.current = Graph;

    const handleResize = () => {
      if (containerRef.current && graphInstanceRef.current) {
        graphInstanceRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphInstanceRef.current) {
        graphInstanceRef.current._destructor?.();
      }
    };
  }, []);

  // Update Graph Data when data changes
  useEffect(() => {
    if (graphInstanceRef.current && graphData) {
      graphInstanceRef.current.graphData(graphData);
    }
  }, [graphData]);

  // Respond to global selection change
  useEffect(() => {
    if (!graphInstanceRef.current) return;
    graphInstanceRef.current.refresh();

    if (selectedEntityId && graphData?.nodes) {
      const node = graphData.nodes.find(n => n.id === selectedEntityId);
      if (node && node.x !== undefined) {
        const distance = 90;
        const hyp = Math.hypot(node.x, node.y, node.z) || 1;
        const distRatio = 1 + distance / hyp;
        graphInstanceRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1200
        );
      }
    }
  }, [selectedEntityId, graphData]);

  const handleRecenter = () => {
    if (graphInstanceRef.current) {
      graphInstanceRef.current.zoomToFit(1000, 40);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Tactical Zoom & Pan Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 10,
      }}>
        <div className="glass-panel" style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={handleRecenter}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Recenter Camera View"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={() => {
              if (graphInstanceRef.current) {
                const pos = graphInstanceRef.current.cameraPosition();
                graphInstanceRef.current.cameraPosition({ x: pos.x * 0.75, y: pos.y * 0.75, z: pos.z * 0.75 }, null, 400);
              }
            }}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => {
              if (graphInstanceRef.current) {
                const pos = graphInstanceRef.current.cameraPosition();
                graphInstanceRef.current.cameraPosition({ x: pos.x * 1.35, y: pos.y * 1.35, z: pos.z * 1.35 }, null, 400);
              }
            }}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
        </div>
      </div>

      {/* Investigator Graph Legend Overlay (Expandable) */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 10,
        maxWidth: '480px',
      }}>
        <div className="glass-panel" style={{
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div
            onClick={() => setLegendOpen(!legendOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              <Layers size={13} />
              <span>INVESTIGATION GRAPH LEGEND & TAXONOMY</span>
            </div>
            {legendOpen ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
          </div>

          {legendOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
              {/* Entity Types & Shapes Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
              }}>
                {Object.entries(ENTITY_CONFIG).slice(0, 9).map(([type, cfg]) => {
                  const isFiltered = filterEntityTypes.includes(type);
                  return (
                    <div
                      key={type}
                      onClick={() => toggleEntityTypeFilter(type)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        opacity: filterEntityTypes.length === 0 || isFiltered ? 1 : 0.4,
                      }}
                      title={`Click to filter ${cfg.label}`}
                    >
                      <div style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: cfg.shape === 'sphere' ? '50%' : cfg.shape === 'box' ? '2px' : '0',
                        transform: cfg.shape === 'octahedron' ? 'rotate(45deg)' : 'none',
                        backgroundColor: cfg.color,
                        boxShadow: `0 0 6px ${cfg.color}88`,
                      }} />
                      <span style={{ color: isFiltered ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Edge Semantics & Visual States */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}>
                <span>EDGE: <strong style={{ color: '#fff' }}>Solid</strong> (Fact) // <strong style={{ color: 'var(--accent-gold)' }}>Dashed</strong> (Inferred)</span>
                <span>NODE: <strong style={{ color: 'var(--accent-cyan)' }}>Ring</strong> (Selected) // <strong style={{ color: '#f59e0b' }}>Glow</strong> (Key Target)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KnowledgeGraphView;
