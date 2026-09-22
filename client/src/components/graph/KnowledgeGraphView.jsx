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
  digital_identity: { color: '#06b6d4', shape: 'cylinder', label: 'Digital Identity' },
  account: { color: '#eab308', shape: 'dodecahedron', label: 'Bank Account' },
};

function drawRoundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Robust camera framing that calculates actual 3D bounding box from active node coordinates.
 * Avoids upstream zoomToFit bugs that collapse camera distance to near-zero.
 */
function fitGraphToCamera(Graph, nodes, transitionMs = 800) {
  if (!Graph || !nodes || nodes.length === 0) return;

  const validNodes = nodes.filter(n => typeof n.x === 'number' && !isNaN(n.x) && isFinite(n.x));
  if (validNodes.length === 0) {
    const defaultDist = Math.max(280, Math.cbrt(nodes.length) * 100);
    Graph.cameraPosition({ x: 0, y: 0, z: defaultDist }, { x: 0, y: 0, z: 0 }, transitionMs);
    return;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const n of validNodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z;
    if (n.z > maxZ) maxZ = n.z;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  let maxSpan = 0;
  for (const n of validNodes) {
    const dist = Math.hypot(n.x - cx, n.y - cy, n.z - cz);
    if (dist > maxSpan) maxSpan = dist;
  }

  // Perspective camera with FOV 50deg: tan(25deg) = 0.4663
  const requiredDist = (maxSpan + 30) / 0.4663;
  const targetZ = Math.max(280, Math.min(1000, Math.round(requiredDist * 1.15)));

  Graph.cameraPosition(
    { x: cx, y: cy, z: cz + targetZ },
    { x: cx, y: cy, z: cz },
    transitionMs
  );
}

/**
 * Creates high-performance 2D canvas sprite for 3D billboarded text labels
 */
function createLabelSprite(text, subtext, color, isSelected, isKeyTarget) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  // Background rounded pill
  const bg = isSelected ? 'rgba(10, 24, 48, 0.96)' : isKeyTarget ? 'rgba(32, 20, 8, 0.94)' : 'rgba(8, 14, 26, 0.92)';
  const border = isSelected ? '#00f2fe' : isKeyTarget ? '#f59e0b' : (color || 'rgba(255, 255, 255, 0.4)');
  const borderWidth = isSelected ? 4 : isKeyTarget ? 3.5 : 2;

  ctx.beginPath();
  drawRoundRect(ctx, 4, 4, 376, 88, 14);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = border;
  ctx.stroke();

  // Draw type pill
  ctx.beginPath();
  drawRoundRect(ctx, 12, 14, 96, 28, 6);
  ctx.fillStyle = color || '#38bdf8';
  ctx.fill();

  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  const typeText = String(subtext || 'ENTITY').toUpperCase().substring(0, 9);
  ctx.fillText(typeText, 60, 33);

  // Draw entity primary label
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  const rawText = String(text || 'Unknown').trim();
  const displayLabel = rawText.length > 20 ? rawText.substring(0, 18) + '…' : rawText;
  ctx.fillText(displayLabel, 118, 35);

  // Status or classification description
  ctx.font = '14px monospace';
  ctx.fillStyle = isSelected ? '#00f2fe' : isKeyTarget ? '#f59e0b' : '#94a3b8';
  ctx.fillText(isSelected ? 'ACTIVE SELECTION' : isKeyTarget ? 'PRIMARY TARGET' : 'INVESTIGATION NODE', 14, 72);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    depthTest: true,
    depthWrite: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  const scaleMultiplier = isSelected ? 1.25 : isKeyTarget ? 1.12 : 1.0;
  sprite.scale.set(30 * scaleMultiplier, 7.5 * scaleMultiplier, 1);
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
    activeView,
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
        const cfg = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.person;
        const color = cfg.color;

        // Central / Key target detection
        const isKeyTarget =
          node.id === 'PER-SULTAN-01' ||
          node.id === 'PER-MUNSHI-02' ||
          (typeof node.id === 'string' && (node.id.includes('BOSS') || node.id.includes('BRIDGE'))) ||
          node.attributes?.riskLevel === 'CRITICAL' ||
          node.attributes?.riskLevel === 'EXTREME';

        const radius = isSelected ? 8.0 : isKeyTarget ? 6.2 : 4.2;

        const group = new THREE.Group();

        // 1. Differentiated 3D Geometry
        const geometry = createNodeGeometry(node.type, radius);
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(isSelected ? '#00f2fe' : isKeyTarget ? '#f59e0b' : color),
          emissiveIntensity: isSelected ? 0.8 : isKeyTarget ? 0.45 : 0.25,
          transparent: false,
          opacity: 1.0,
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // 2. Selection / Focus Halo Ring
        const ringGeo = new THREE.RingGeometry(radius + 1.4, radius + 3.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(isSelected ? '#00f2fe' : '#f59e0b'),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.visible = isSelected || isKeyTarget;
        group.add(ring);

        // 3. Named Node Label Sprite (Billboarded Canvas Text)
        const nodeLabel = node.label || node.name || node.attributes?.alias || node.id;
        const labelSprite = createLabelSprite(
          nodeLabel,
          node.type,
          color,
          isSelected,
          isKeyTarget
        );
        labelSprite.position.set(0, radius + 5.5, 0);
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
      .nodeRelSize(7)
      .linkWidth(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const isConnected = selectedEntityIdRef.current === srcId || selectedEntityIdRef.current === tgtId;

        if (isFilteringActiveRef.current) {
          const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
          if (focused) return 3.8;
          const active = activeNodeIdsRef.current?.has(srcId) && activeNodeIdsRef.current?.has(tgtId);
          if (!active) return 0.6;
          return isConnected ? 3.2 : 1.8;
        }

        return isConnected ? 3.2 : 1.6;
      })
      .linkColor(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const isConnected = selectedEntityIdRef.current === srcId || selectedEntityIdRef.current === tgtId;

        if (isFilteringActiveRef.current) {
          const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
          if (focused) return '#f59e0b';
          const active = activeNodeIdsRef.current?.has(srcId) && activeNodeIdsRef.current?.has(tgtId);
          if (!active) return 'rgba(255, 255, 255, 0.08)';
          if (isConnected) return '#00f2fe';
          return 'rgba(0, 240, 255, 0.7)';
        }

        if (isConnected) return '#00f2fe';
        if (link.classification === 'FACT') return 'rgba(0, 240, 255, 0.65)';
        return 'rgba(245, 158, 11, 0.65)';
      })
      .linkOpacity(0.7)
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

        return isConnected ? 4 : 2;
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
        return 2.5;
      })
      .linkDirectionalParticleSpeed(0.008)
      .linkDirectionalParticleColor(link => {
        const srcId = link.source?.id || link.source;
        const tgtId = link.target?.id || link.target;
        const focused = focusedNodeIdsRef.current.has(srcId) && focusedNodeIdsRef.current.has(tgtId);
        return focused ? '#f59e0b' : '#00f2fe';
      })
      .warmupTicks(30)
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
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          graphInstanceRef.current.width(w).height(h);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (graphInstanceRef.current) {
        graphInstanceRef.current._destructor?.();
        graphInstanceRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Update Graph Data when data changes
  useEffect(() => {
    if (graphInstanceRef.current && graphData) {
      nodeObjectsRef.current.clear();

      // Deep-clone and index nodes to prevent ForceGraph3D from mutating original store state
      const rawNodes = graphData.nodes || [];
      const nodeMap = new Map();
      const nodes = rawNodes.map(n => {
        const copy = { ...n };
        nodeMap.set(copy.id, copy);
        return copy;
      });

      // Filter links to strictly those whose source and target exist in node set
      const validLinks = (graphData.links || [])
        .map(l => {
          const s = typeof l.source === 'object' && l.source !== null ? l.source.id : l.source;
          const t = typeof l.target === 'object' && l.target !== null ? l.target.id : l.target;
          return { ...l, source: s, target: t };
        })
        .filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

      const cleanData = { nodes, links: validLinks };

      graphInstanceRef.current.graphData(cleanData);
      graphInstanceRef.current.resumeAnimation?.();
      graphInstanceRef.current.d3ReheatSimulation?.();

      // Automatically frame camera so all nodes and relationships are in direct, crystal-clear view
      if (cleanData.nodes.length > 0) {
        setTimeout(() => {
          if (graphInstanceRef.current) {
            const liveNodes = graphInstanceRef.current.graphData()?.nodes || cleanData.nodes;
            fitGraphToCamera(graphInstanceRef.current, liveNodes, 700);
          }
        }, 250);
      }
    }
  }, [graphData]);

  // Refresh and resize whenever user switches back to Graph view
  useEffect(() => {
    if (activeView === 'graph' && graphInstanceRef.current && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current && graphInstanceRef.current) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          if (w > 0 && h > 0) {
            graphInstanceRef.current.width(w).height(h);
            graphInstanceRef.current.resumeAnimation?.();
            graphInstanceRef.current.refresh();
            graphInstanceRef.current.d3ReheatSimulation?.();
          }
        }
      }, 50);
    }
  }, [activeView]);

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

    if (selectedEntityId) {
      const liveNodes = graphInstanceRef.current.graphData()?.nodes || [];
      const node = liveNodes.find(n => n.id === selectedEntityId);
      if (node && typeof node.x === 'number' && !isNaN(node.x)) {
        const distance = 95;
        const hyp = Math.hypot(node.x, node.y, node.z) || 1;
        const distRatio = 1 + distance / hyp;
        graphInstanceRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          { x: node.x, y: node.y, z: node.z },
          1200
        );
      }
    }
  }, [selectedEntityId]);

  const handleRecenter = () => {
    if (graphInstanceRef.current) {
      const liveNodes = graphInstanceRef.current.graphData()?.nodes || [];
      fitGraphToCamera(graphInstanceRef.current, liveNodes, 1000);
    }
  };

  const handleReheatSimulation = () => {
    if (graphInstanceRef.current) {
      const currentData = graphInstanceRef.current.graphData();
      if (currentData && currentData.nodes) {
        currentData.nodes.forEach(n => {
          n.vx = (n.vx || 0) + (Math.random() - 0.5) * 12;
          n.vy = (n.vy || 0) + (Math.random() - 0.5) * 12;
          n.vz = (n.vz || 0) + (Math.random() - 0.5) * 12;
        });
      }
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
