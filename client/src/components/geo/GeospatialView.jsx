/**
 * CONSTELLATION — 3D Geospatial Intelligence Globe & Analytical Map
 */
import React, { useEffect, useRef, useState } from 'react';
import Globe from 'globe.gl';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  Compass,
  MapPin,
  Route,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

export function GeospatialView() {
  const containerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const [selectedLoc, setSelectedLoc] = useState(null);

  const {
    geoData,
    selectedLocationId,
    selectLocation,
    selectEntity,
    activeCase,
  } = useInvestigationStore();

  const selectedLocationIdRef = useRef(selectedLocationId);
  selectedLocationIdRef.current = selectedLocationId;

  useEffect(() => {
    if (!containerRef.current) return;

    if (globeInstanceRef.current) {
      globeInstanceRef.current._destructor?.();
      containerRef.current.innerHTML = '';
    }

    const width = containerRef.current.clientWidth || window.innerWidth - 700;
    const height = containerRef.current.clientHeight || window.innerHeight - 80;

    const globe = Globe()(containerRef.current)
      .width(width)
      .height(height)
      .backgroundColor('#07090e')
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#00f2fe')
      .atmosphereAltitude(0.18)
      // Points / Incident Locations
      .pointsData(geoData.locations || [])
      .pointLat('latitude')
      .pointLng('longitude')
      .pointColor(loc => loc.id === selectedLocationIdRef.current ? '#00f2fe' : (loc.locationType === 'OPERATIONAL_SITE' ? '#ef4444' : '#f59e0b'))
      .pointAltitude(loc => loc.id === selectedLocationIdRef.current ? 0.15 : 0.08)
      .pointRadius(loc => loc.id === selectedLocationIdRef.current ? 1.2 : 0.7)
      .pointLabel(loc => `
        <div style="background: rgba(14, 19, 31, 0.95); border: 1px solid #00f2fe; padding: 8px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <div style="font-weight: 700; color: #00f2fe; font-size: 13px;">${loc.name}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">${loc.city}, ${loc.country}</div>
          <div style="color: #f59e0b; font-size: 10px; font-family: monospace; margin-top: 4px;">Role: ${loc.locationType}</div>
          <div style="color: #64748b; font-size: 9px; font-family: monospace; margin-top: 2px;">Coords: [${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}]</div>
        </div>
      `)
      .onPointClick(loc => {
        setSelectedLoc(loc);
        selectLocation(loc.id);
        if (loc.entityId) selectEntity(loc.entityId);
        // Smooth camera fly-to
        globe.pointOfView({ lat: loc.latitude, lng: loc.longitude, altitude: 0.8 }, 1400);
      })
      // Inter-City Value Arcs (Hawala, Transit, Contraband)
      .arcsData(geoData.arcs || [])
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(2000)
      .arcStroke(1.2)
      .arcAltitude(0.25)
      .arcLabel(arc => `
        <div style="background: rgba(14, 19, 31, 0.95); border: 1px solid ${arc.color}; padding: 8px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; color: #fff;">
          <div style="font-weight: 700; color: ${arc.color}">${arc.name}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">${arc.fromCity} ➔ ${arc.toCity}</div>
          <div style="color: #00f2fe; font-size: 10px; font-family: monospace; margin-top: 4px;">Channel: ${arc.type}</div>
        </div>
      `)
      // Rings on active sites
      .ringsData(geoData.locations.filter(l => l.locationType === 'OPERATIONAL_SITE'))
      .ringLat('latitude')
      .ringLng('longitude')
      .ringColor(() => '#ef4444')
      .ringMaxRadius(3)
      .ringPropagationSpeed(1.5)
      .ringRepeatPeriod(1200);

    // Default Point of View: Center on Indian Subcontinent
    globe.pointOfView({ lat: 22.5, lng: 78.5, altitude: 1.8 }, 1000);

    globeInstanceRef.current = globe;

    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        globeInstanceRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current) {
        globeInstanceRef.current._destructor?.();
      }
    };
  }, []);

  // Update Points & Arcs when geoData changes
  useEffect(() => {
    if (globeInstanceRef.current && geoData) {
      globeInstanceRef.current
        .pointsData(geoData.locations || [])
        .arcsData(geoData.arcs || []);
    }
  }, [geoData]);

  // Camera flight and pin highlight when selectedLocationId updates
  useEffect(() => {
    if (!globeInstanceRef.current || !geoData?.locations) return;
    // Re-evaluate point colors to highlight active pin
    globeInstanceRef.current.pointsData([...geoData.locations]);

    if (selectedLocationId) {
      const targetLoc = geoData.locations.find(l => l.id === selectedLocationId);
      if (targetLoc) {
        setSelectedLoc(targetLoc);
        globeInstanceRef.current.pointOfView(
          { lat: targetLoc.latitude, lng: targetLoc.longitude, altitude: 0.7 },
          1500
        );
      }
    }
  }, [selectedLocationId, geoData]);

  const handleRecenterIndia = () => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointOfView({ lat: 22.5, lng: 78.5, altitude: 1.8 }, 1200);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D Globe Container */}
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
            onClick={handleRecenterIndia}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '4px' }}
            title="Focus Indian Operations Center"
          >
            <Compass size={15} color="var(--accent-cyan)" />
          </button>
          <button
            onClick={() => {
              if (globeInstanceRef.current) {
                const pov = globeInstanceRef.current.pointOfView();
                globeInstanceRef.current.pointOfView({ altitude: pov.altitude * 0.7 }, 500);
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
              if (globeInstanceRef.current) {
                const pov = globeInstanceRef.current.pointOfView();
                globeInstanceRef.current.pointOfView({ altitude: pov.altitude * 1.4 }, 500);
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

      {/* City Hub Quick Navigation Pills */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 10,
      }}>
        <div className="glass-panel" style={{
          padding: '6px',
          display: 'flex',
          gap: '6px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}>
          {[
            { city: 'Delhi', lat: 28.57, lng: 77.22, label: 'Delhi (Safehouse)' },
            { city: 'Mumbai', lat: 18.95, lng: 72.83, label: 'Mumbai (Hawala)' },
            { city: 'Dubai', lat: 25.07, lng: 55.14, label: 'Dubai (Command)' },
            { city: 'Kolkata', lat: 22.53, lng: 88.31, label: 'Kolkata (Port)' },
            { city: 'Bengaluru', lat: 12.97, lng: 77.64, label: 'Bengaluru (Cyber)' },
          ].map(hub => (
            <button
              key={hub.city}
              onClick={() => {
                if (globeInstanceRef.current) {
                  globeInstanceRef.current.pointOfView({ lat: hub.lat, lng: hub.lng, altitude: 0.65 }, 1400);
                }
              }}
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '10px' }}
            >
              📍 {hub.city}
            </button>
          ))}
        </div>
      </div>

      {/* Active Location Card Inspection Overlay */}
      {selectedLoc && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 10,
          maxWidth: '360px',
        }}>
          <div className="glass-panel-elevated" style={{ padding: '14px', border: '1px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-cyan">{selectedLoc.locationType}</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                CONFIDENCE: {(selectedLoc.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
              {selectedLoc.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {selectedLoc.address || selectedLoc.city}, {selectedLoc.country}
            </div>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', marginTop: '6px' }}>
              LAT: {selectedLoc.latitude.toFixed(4)} | LNG: {selectedLoc.longitude.toFixed(4)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Intelligence Source: {selectedLoc.source}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
