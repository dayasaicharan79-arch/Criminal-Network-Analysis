/**
 * CONSTELLATION — 3D WebGL Knowledge Graph Visualization
 */
import React, { useEffect, useRef, useState } from 'react';
import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Camera,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const ENTITY_COLORS = {
  criminal: '#ef4444',     // Crimson
  suspect: '#f59e0b',      // Amber
  organization: '#00f2fe', // Cyan
  phone: '#10b981',        // Emerald
  vehicle: '#3b82f6',      // Blue
  transaction: '#eab308',  // Gold
  device: '#a855f7',       // Purple
  location: '#ec4899',     // Pink
  document: '#64748b',     // Slate
  fir: '#f97316',          // Orange
};

export function KnowledgeGraphView() {
  const containerRef = useRef(null);
  const graphInstanceRef = useRef(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);

  const {
    graphData,
    selectedEntityId,
    selectEntity,
    selectRelationship,
    analyticsData,
  } = useInvestigationStore();

  const selectedEntityIdRef = useRef(selectedEntityId);
  selectedEntityIdRef.current = selectedEntityId;

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup prior instance if any
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
        <div style="background: rgba(14, 19, 31, 0.95); border: 1px solid #00f2fe; padding: 8px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <div style="font-weight: 700; color: ${ENTITY_COLORS[node.type] || '#fff'}; font-size: 13px;">${node.label}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">Type: ${node.type.toUpperCase()}</div>
          <div style="color: #00f2fe; font-size: 10px; font-family: monospace; margin-top: 4px;">ID: ${node.id}</div>
        </div>
      `)
      .nodeThreeObject(node => {
        const isSelected = selectedEntityIdRef.current === node.id;
        const isHovered = hoverNode?.id === node.id;
        const color = ENTITY_COLORS[node.type] || '#94a3b8';

        // Sphere size based on centrality or selection
        let radius = isSelected ? 8 : (isHovered ? 6.5 : 5);
        if (node.id === 'PER-SULTAN-01' || node.id === 'PER-MUNSHI-02') radius += 2;

        const group = new THREE.Group();
        const geometry = new THREE.SphereGeometry(radius, 24, 24);
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(isSelected ? '#00f2fe' : (isHovered ? color : '#000')),
          emissiveIntensity: isSelected ? 0.6 : (isHovered ? 0.3 : 0.05),
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // Selection ring
        if (isSelected) {
          const ringGeo = new THREE.RingGeometry(radius + 2, radius + 3.5, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color('#00f2fe'),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          group.add(ring);
        }

        return group;
      })
      .nodeRelSize(6)
      .linkWidth(link => {
        const currSelected = selectedEntityIdRef.current;
        const isConnected = currSelected === (link.source?.id || link.source) ||
                            currSelected === (link.target?.id || link.target);
        return isConnected ? 2.5 : 1;
      })
      .linkColor(link => {
        const currSelected = selectedEntityIdRef.current;
        const isConnected = currSelected === (link.source?.id || link.source) ||
                            currSelected === (link.target?.id || link.target);
        if (isConnected) return '#00f2fe';
        if (link.classification === 'FACT') return 'rgba(255, 255, 255, 0.25)';
        return 'rgba(245, 158, 11, 0.4)';
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
        // Smooth camera fly-to with non-zero hypotenuse guard
        const distance = 80;
        const hyp = Math.hypot(node.x, node.y, node.z) || 1;
        const distRatio = 1 + distance / hyp;
        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1500
        );
      })
      .onLinkClick(link => {
        selectRelationship(link);
      })
      .onNodeHover(node => {
        setHoverNode(node || null);
      });

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xcccccc, Math.PI);
    Graph.scene().add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8 * Math.PI);
    dirLight.position.set(0, 100, 100);
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

  // Respond to global selection change (e.g. from search or timeline)
  useEffect(() => {
    if (!graphInstanceRef.current) return;
    // Re-evaluate node colors and link highlights
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
      {/* 3D Canvas Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Tactical Overlay Controls */}
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
            title="Recenter Camera"
          >
            <Maximize2 size={15} />
          </button>
          <button
            onClick={() => {
              if (graphInstanceRef.current) {
                const currentPos = graphInstanceRef.current.cameraPosition();
                graphInstanceRef.current.cameraPosition({ x: currentPos.x * 0.75, y: currentPos.y * 0.75, z: currentPos.z * 0.75 }, null, 400);
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
                const currentPos = graphInstanceRef.current.cameraPosition();
                graphInstanceRef.current.cameraPosition({ x: currentPos.x * 1.35, y: currentPos.y * 1.35, z: currentPos.z * 1.35 }, null, 400);
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

      {/* Entity Type Legend Bar */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 10,
      }}>
        <div className="glass-panel" style={{
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}>
          {Object.entries(ENTITY_COLORS).slice(0, 6).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
