/**
 * CONSTELLATION — 3D WebGL Knowledge Graph Visualization
 *
 * Implements:
 * - Named nodes rendering real entity names and types from backend
 * - Performance-aware billboarded canvas sprite label system with distance/zoom LOD
 * - 3D geometric visual differentiation per entity type (Sphere, Cube, Cylinder, Cone, Octahedron, etc.)
 * - Rich tactical investigator legend documenting shapes, edge semantics, and analytical states
 * - Interactive 3D Graph Physics Controls (Charge, Link Distance, Collision, Damping, Community Anchors)
 * - Timeline ↔ Graph Temporal Playback Synchronization
 * - Cross-Filter Query Presets Bar
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { forceCollide, forceX, forceZ } from 'd3-force-3d';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  PlayCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import GraphPhysicsHUD from './GraphPhysicsHUD.jsx';
import TimelinePlaybackBar from './TimelinePlaybackBar.jsx';
import QueryPresetsBar from './QueryPresetsBar.jsx';

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
  const nodeObjectsRef = useRef(new Map());

  const [hoverNode, setHoverNode] = useState(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [physicsHUDOpen, setPhysicsHUDOpen] = useState(false);
  const [timelineHUDOpen, setTimelineHUDOpen] = useState(true);

  const {
    graphData,
    selectedEntityId,
    selectEntity,
    selectRelationship,
    filterEntityTypes,
    toggleEntityTypeFilter,
    graphPhysics,
    timelinePlayback,
    timelineEvents,
    analyticsData,
  } = useInvestigationStore();

  const selectedEntityIdRef = useRef(selectedEntityId);
  selectedEntityIdRef.current = selectedEntityId;

  const { isPlaying, currentTime, windowMode, activeEventIndex } = timelinePlayback;

  // Sorted timeline events
  const sortedEvents = useMemo(() => {
    return [...(timelineEvents || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [timelineEvents]);

  // Determine active and focused entities based on timeline state
  const { activeNodeIds, focusedNodeIds, isFilteringActive } = useMemo(() => {
    if (!currentTime || sortedEvents.length === 0) {
      return { activeNodeIds: null, focusedNodeIds: new Set(), isFilteringActive: false };
    }
    const curDate = new Date(currentTime);
    let activeEvs = [];
    let focusEv = null;

    if (windowMode === 'cumulative') {
      activeEvs = sortedEvents.filter(e => new Date(e.timestamp) <= curDate);
      focusEv = sortedEvents[activeEventIndex] || activeEvs[activeEvs.length - 1] || null;
    } else {
      focusEv = sortedEvents[activeEventIndex] || sortedEvents.find(e => e.timestamp === currentTime) || null;
      activeEvs = focusEv ? [focusEv] : [];
    }

    const activeSet = new Set(activeEvs.flatMap(e => e.entityIds || []));
    const focusSet = new Set(focusEv?.entityIds || []);

    return {
      activeNodeIds: activeSet,
      focusedNodeIds: focusSet,
      isFilteringActive: true,
    };
  }, [currentTime, windowMode, activeEventIndex, sortedEvents]);

  // Keep refs for link accessors
  const activeNodeIdsRef = useRef(activeNodeIds);
  activeNodeIdsRef.current = activeNodeIds;

  const focusedNodeIdsRef = useRef(focusedNodeIds);
  focusedNodeIdsRef.current = focusedNodeIds;

  const isFilteringActiveRef = useRef(isFilteringActive);
  isFilteringActiveRef.current = isFilteringActive;

  // Initialize 3D Force Graph
  useEffect(() => {
    if (!containerRef.current) return;

    if (graphInstanceRef.current) {
      graphInstanceRef.current._destructor?.();
      containerRef.current.innerHTML = '';
      nodeObjectsRef.current.clear();
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

        // Central / Key target detection
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
          transparent: true,
          opacity: 1.0,
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // 2. Selection / Focus Halo Ring
        const ringGeo = new THREE.RingGeometry(radius + 2, radius + 4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#00f2fe'),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.visible = isSelected;
        group.add(ring);

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

        // Cache object elements for instant temporal visual modulation
        nodeObjectsRef.current.set(node.id, {
          mesh,
          material,
          ring,
          labelSprite,
          baseColor: color,
          isKeyTarget,
        });

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
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const isConnected = selectedEntityIdRef.current === srcId || selectedEntityIdRef.current === tgtId;

        if (isFilteringActiveRef.current) {
          const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
          if (focused) return 3.6;
          const active = activeNodeIdsRef.current?.has(srcId) && activeNodeIdsRef.current?.has(tgtId);
          if (!active) return 0.5;
          return isConnected ? 2.8 : 1.6;
        }

        return isConnected ? 2.8 : 1.2;
      })
      .linkColor(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const isConnected = selectedEntityIdRef.current === srcId || selectedEntityIdRef.current === tgtId;

        if (isFilteringActiveRef.current) {
          const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
          if (focused) return '#f59e0b';
          const active = activeNodeIdsRef.current?.has(srcId) && activeNodeIdsRef.current?.has(tgtId);
          if (!active) return 'rgba(255, 255, 255, 0.05)';
          if (isConnected) return '#00f2fe';
          return 'rgba(0, 240, 255, 0.6)';
        }

        if (isConnected) return '#00f2fe';
        if (link.classification === 'FACT') return 'rgba(255, 255, 255, 0.3)';
        return 'rgba(245, 158, 11, 0.45)';
      })
      .linkDirectionalParticles(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const isConnected = selectedEntityIdRef.current === srcId || selectedEntityIdRef.current === tgtId;

        if (isFilteringActiveRef.current) {
          const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
          if (focused) return 5;
          const active = activeNodeIdsRef.current?.has(srcId) && activeNodeIdsRef.current?.has(tgtId);
          if (!active) return 0;
          return isConnected ? 4 : 2;
        }

        return isConnected ? 4 : 1;
      })
      .linkDirectionalParticleWidth(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        if (isFilteringActiveRef.current) {
          const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
          if (focused) return 3.2;
          const active = activeNodeIdsRef.current?.has(srcId) && activeNodeIdsRef.current?.has(tgtId);
          if (!active) return 0;
        }
        return 1.8;
      })
      .linkDirectionalParticleSpeed(0.007)
      .linkDirectionalParticleColor(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
        return focused ? '#f59e0b' : '#00f2fe';
      })
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
      nodeObjectsRef.current.clear();
      graphInstanceRef.current.graphData(graphData);
    }
  }, [graphData]);

  // Apply Analyst Physics Tuning to D3 Simulation
  useEffect(() => {
    const Graph = graphInstanceRef.current;
    if (!Graph || !graphPhysics) return;

    // 1. Charge / Repulsion strength
    Graph.d3Force('charge')?.strength(graphPhysics.chargeStrength);

    // 2. Link Spring Distance
    Graph.d3Force('link')?.distance(graphPhysics.linkDistance);

    // 3. Collision avoidance radius
    if (graphPhysics.collisionRadius > 0) {
      Graph.d3Force('collide', forceCollide(node => 7 + graphPhysics.collisionRadius));
    } else {
      Graph.d3Force('collide', null);
    }

    // 4. Simulation Damping / Velocity Decay
    if (typeof Graph.d3VelocityDecay === 'function') {
      Graph.d3VelocityDecay(graphPhysics.velocityDecay ?? graphPhysics.damping);
    }

    // 5. Community / Clustering Anchors
    if (graphPhysics.communityAnchors && analyticsData?.communities?.length > 0) {
      const comms = analyticsData.communities;
      const K = comms.length;
      const nodeCommunityMap = new Map();
      comms.forEach((comm, idx) => {
        const angle = (2 * Math.PI * idx) / Math.max(1, K);
        const radius = 130;
        const cx = radius * Math.cos(angle);
        const cz = radius * Math.sin(angle);
        (comm.memberEntities || []).forEach(ent => {
          if (ent?.id) {
            nodeCommunityMap.set(ent.id, { x: cx, z: cz });
          }
        });
      });

      Graph.d3Force('clusterX', forceX(n => nodeCommunityMap.get(n.id)?.x || 0).strength(0.14));
      Graph.d3Force('clusterZ', forceZ(n => nodeCommunityMap.get(n.id)?.z || 0).strength(0.14));
    } else {
      Graph.d3Force('clusterX', null);
      Graph.d3Force('clusterZ', null);
    }

    // Reheat simulation smoothly so forces take effect
    Graph.d3ReheatSimulation();
  }, [graphPhysics, analyticsData]);

  // Modulate Node & Link Appearance During Timeline Playback / Filtering
  useEffect(() => {
    nodeObjectsRef.current.forEach((obj, nodeId) => {
      const { material, ring, labelSprite, baseColor, isKeyTarget } = obj;
      const isSelected = selectedEntityId === nodeId;
      const isFocused = focusedNodeIds.has(nodeId);
      const isActive = !isFilteringActive || (activeNodeIds && activeNodeIds.has(nodeId));

      if (!isActive) {
        // Outside temporal window: gracefully dimmed without losing position
        material.transparent = true;
        material.opacity = 0.18;
        material.emissiveIntensity = 0.0;
        if (labelSprite) labelSprite.visible = false;
        if (ring) ring.visible = false;
      } else if (isFocused) {
        // In-focus milestone event actor
        material.transparent = false;
        material.opacity = 1.0;
        material.emissive.set(isSelected ? '#00f2fe' : '#f59e0b');
        material.emissiveIntensity = 0.85;
        if (labelSprite) labelSprite.visible = true;
        if (ring) {
          ring.visible = true;
          ring.material.color.set(isSelected ? '#00f2fe' : '#f59e0b');
        }
      } else {
        // Active entity in cumulative timeline
        material.transparent = false;
        material.opacity = isFilteringActive ? 0.85 : 1.0;
        material.emissive.set(isSelected ? '#00f2fe' : isKeyTarget ? '#f59e0b' : '#000000');
        material.emissiveIntensity = isSelected ? 0.7 : isKeyTarget ? 0.25 : 0.05;
        if (labelSprite) labelSprite.visible = true;
        if (ring) {
          ring.visible = isSelected;
          ring.material.color.set('#00f2fe');
        }
      }
    });

    if (graphInstanceRef.current) {
      // Re-evaluate link widths and colors
      graphInstanceRef.current.refresh();
    }
  }, [activeNodeIds, focusedNodeIds, isFilteringActive, selectedEntityId]);

  // Respond to global selection change (auto camera fly-to)
  useEffect(() => {
    if (!graphInstanceRef.current) return;

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

  const handleReheatSimulation = () => {
    if (graphInstanceRef.current) {
      graphInstanceRef.current.d3ReheatSimulation();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Floating Bar: Controls & Presets */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      >
        {/* Left cluster: Zoom controls + Query Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
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

          {/* Cross-Filter Query Presets Bar */}
          <QueryPresetsBar />
        </div>

        {/* Right cluster: HUD Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {/* Reheat Simulation Quick Button */}
          <button
            onClick={handleReheatSimulation}
            title="Reheat 3D Simulation Dynamics"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(10, 15, 29, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} />
            <span>Reheat</span>
          </button>

          {/* Physics HUD Toggle */}
          <button
            onClick={() => setPhysicsHUDOpen(!physicsHUDOpen)}
            title="Toggle 3D Graph Physics Controls"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: physicsHUDOpen ? 'rgba(0, 240, 255, 0.2)' : 'rgba(10, 15, 29, 0.75)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${physicsHUDOpen ? '#00f0ff' : 'rgba(255, 255, 255, 0.12)'}`,
              color: physicsHUDOpen ? '#00f0ff' : '#94a3b8',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: physicsHUDOpen ? '0 0 12px rgba(0, 240, 255, 0.25)' : 'none',
            }}
          >
            <Sliders size={13} />
            <span>Physics</span>
          </button>

          {/* Timeline Playback HUD Toggle */}
          <button
            onClick={() => setTimelineHUDOpen(!timelineHUDOpen)}
            title="Toggle Timeline Playback HUD"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: timelineHUDOpen ? 'rgba(0, 240, 255, 0.2)' : 'rgba(10, 15, 29, 0.75)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${timelineHUDOpen ? '#00f0ff' : 'rgba(255, 255, 255, 0.12)'}`,
              color: timelineHUDOpen ? '#00f0ff' : '#94a3b8',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: timelineHUDOpen ? '0 0 12px rgba(0, 240, 255, 0.25)' : 'none',
            }}
          >
            <PlayCircle size={13} />
            <span>Timeline</span>
          </button>
        </div>
      </div>

      {/* Physics HUD Floating Panel */}
      <GraphPhysicsHUD
        isOpen={physicsHUDOpen}
        onClose={() => setPhysicsHUDOpen(false)}
        onReheat={handleReheatSimulation}
      />

      {/* Timeline Playback Bar Floating Dock */}
      <TimelinePlaybackBar
        isOpen={timelineHUDOpen}
        onClose={() => setTimelineHUDOpen(false)}
      />

      {/* Investigator Graph Legend Overlay (Expandable) */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 10,
          maxWidth: '480px',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
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
                      <div
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: cfg.shape === 'sphere' ? '50%' : cfg.shape === 'box' ? '2px' : '0',
                          transform: cfg.shape === 'octahedron' ? 'rotate(45deg)' : 'none',
                          backgroundColor: cfg.color,
                          boxShadow: `0 0 6px ${cfg.color}88`,
                        }}
                      />
                      <span style={{ color: isFiltered ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Edge Semantics & Visual States */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
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
