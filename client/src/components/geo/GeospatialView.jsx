/**
 * CONSTELLATION — Entity-Centric 3D Geospatial Intelligence Globe
 * 
 * Features:
 * - Direct Entity -> Location Intelligence Workflow
 * - Multi-location navigation for key targets (Primary, Secondary, Operational)
 * - Controlled compact marker sizing (no giant dominating spheres)
 * - Billboarded dynamic entity/city location labels
 * - High-resolution local Earth textures + GeoJSON sovereign borders (India recognition)
 * - Dynamic transit corridors and financial value arcs
 * - Operational category filtering (Operational, Financial, Transit, Meeting)
 * - Graph <-> Globe bidirectional synchronization
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Filter,
  Building,
  User,
  Activity,
  Calendar,
  Shield,
  ExternalLink,
  ChevronRight,
  Crosshair,
} from 'lucide-react';

const TYPE_COLORS = {
  OPERATIONAL_SITE: '#ef4444',
  FINANCIAL_INSTITUTION: '#00f2fe',
  TRANSIT_HUB: '#f59e0b',
  MEETING_POINT: '#a855f7',
  SAFEHOUSE: '#10b981',
};

const TYPE_LABELS = {
  OPERATIONAL_SITE: 'Operational Site',
  FINANCIAL_INSTITUTION: 'Financial / Hawala Hub',
  TRANSIT_HUB: 'Transit & Freight Hub',
  MEETING_POINT: 'Meeting Point',
  SAFEHOUSE: 'Covert Safehouse',
};

export function GeospatialView() {
  const containerRef = useRef(null);
  const globeInstanceRef = useRef(null);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [countriesGeoJson, setCountriesGeoJson] = useState(null);
  const [selectedLocOverride, setSelectedLocOverride] = useState(null);

  const {
    geoData,
    selectedLocationId,
    selectLocation,
    selectedEntityId,
    selectedEntity,
    selectEntity,
    activeCase,
    timelineEvents,
  } = useInvestigationStore();

  const selectedLocationIdRef = useRef(selectedLocationId);
  selectedLocationIdRef.current = selectedLocationId;

  const selectedEntityIdRef = useRef(selectedEntityId);
  selectedEntityIdRef.current = selectedEntityId;

  // Load local GeoJSON country boundaries once
  useEffect(() => {
    fetch('/geo/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          setCountriesGeoJson(data.features);
        }
      })
      .catch(err => {
        console.warn('Local country GeoJSON load deferred:', err);
      });
  }, []);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    const all = geoData?.locations || [];
    if (categoryFilter === 'ALL') return all;
    return all.filter(l => l.locationType === categoryFilter);
  }, [geoData, categoryFilter]);

  // Locations specifically associated with the currently selected entity
  const entityLocations = useMemo(() => {
    if (!selectedEntityId) return [];
    const all = geoData?.locations || [];
    return all.filter(l => 
      l.entityId === selectedEntityId || 
      (Array.isArray(l.associatedEntityIds) && l.associatedEntityIds.includes(selectedEntityId))
    );
  }, [selectedEntityId, geoData]);

  // Currently active location object
  const activeLocation = useMemo(() => {
    if (selectedLocOverride) return selectedLocOverride;
    if (selectedLocationId && geoData?.locations) {
      return geoData.locations.find(l => l.id === selectedLocationId) || null;
    }
    if (entityLocations.length > 0) {
      return entityLocations[0];
    }
    return null;
  }, [selectedLocationId, geoData, entityLocations, selectedLocOverride]);

  // Labels for Globe (Entity badge + city name)
  const labelsData = useMemo(() => {
    const labels = [];
    if (activeLocation) {
      const entName = selectedEntity?.label || (activeLocation.entityId === 'PER-SULTAN-01' ? 'Sultan' : null);
      const title = entName ? `${entName}\n${activeLocation.city}` : `${activeLocation.name}\n${activeLocation.city}`;
      labels.push({
        lat: activeLocation.latitude,
        lng: activeLocation.longitude,
        text: title,
        color: '#00f2fe',
        size: 1.25,
        altitude: 0.02,
      });
    }
    return labels;
  }, [activeLocation, selectedEntity]);

  // Initialize Globe
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
      .globeImageUrl('/geo/earth-blue-marble.jpg')
      .bumpImageUrl('/geo/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#00f2fe')
      .atmosphereAltitude(0.18)
      // Compact Points / Incident Locations
      .pointsData(filteredLocations)
      .pointLat('latitude')
      .pointLng('longitude')
      .pointAltitude(loc => (loc.id === selectedLocationIdRef.current ? 0.04 : 0.015))
      .pointRadius(loc => {
        const isSel = loc.id === selectedLocationIdRef.current;
        const isEnt = selectedEntityIdRef.current && (
          loc.entityId === selectedEntityIdRef.current || 
          (Array.isArray(loc.associatedEntityIds) && loc.associatedEntityIds.includes(selectedEntityIdRef.current))
        );
        if (isSel) return 0.48;
        if (isEnt) return 0.40;
        return 0.28;
      })
      .pointColor(loc => {
        const isSel = loc.id === selectedLocationIdRef.current;
        const isEnt = selectedEntityIdRef.current && (
          loc.entityId === selectedEntityIdRef.current || 
          (Array.isArray(loc.associatedEntityIds) && loc.associatedEntityIds.includes(selectedEntityIdRef.current))
        );
        if (isSel) return '#00f2fe';
        if (isEnt) return '#38bdf8';
        return TYPE_COLORS[loc.locationType] || '#f59e0b';
      })
      .pointLabel(loc => `
        <div style="background: rgba(14, 19, 31, 0.96); border: 1px solid #00f2fe; padding: 8px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
          <div style="font-weight: 700; color: #00f2fe; font-size: 13px;">${loc.name}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">${loc.city}, ${loc.state ? `${loc.state}, ` : ''}${loc.country}</div>
          <div style="color: #f59e0b; font-size: 10px; font-family: monospace; margin-top: 4px;">Role: ${TYPE_LABELS[loc.locationType] || loc.locationType}</div>
          <div style="color: #64748b; font-size: 9px; font-family: monospace; margin-top: 2px;">Coords: [${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}]</div>
        </div>
      `)
      .onPointClick(loc => {
        setSelectedLocOverride(loc);
        selectLocation(loc.id);
        if (loc.entityId) {
          selectEntity(loc.entityId);
        }
        globe.pointOfView({ lat: loc.latitude, lng: loc.longitude, altitude: 0.65 }, 1200);
      })
      // Billboarded Labels Data for selected node
      .labelsData(labelsData)
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius(0.3)
      .labelAltitude('altitude')
      .labelResolution(2)
      // Arcs Data (Transit & Hawala Corridors)
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
      .arcStroke(1.1)
      .arcAltitude(0.22)
      .arcLabel(arc => `
        <div style="background: rgba(14, 19, 31, 0.95); border: 1px solid ${arc.color}; padding: 8px 12px; border-radius: 6px; font-family: sans-serif; font-size: 12px; color: #fff;">
          <div style="font-weight: 700; color: ${arc.color}">${arc.name}</div>
          <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">${arc.fromCity} ➔ ${arc.toCity}</div>
          <div style="color: #00f2fe; font-size: 10px; font-family: monospace; margin-top: 4px;">Channel: ${arc.type}</div>
        </div>
      `)
      // Subtle pulse rings on high-priority operational sites
      .ringsData(filteredLocations.filter(l => l.locationType === 'OPERATIONAL_SITE' || l.id === selectedLocationIdRef.current))
      .ringLat('latitude')
      .ringLng('longitude')
      .ringColor(l => l.id === selectedLocationIdRef.current ? '#00f2fe' : '#ef4444')
      .ringMaxRadius(1.6)
      .ringPropagationSpeed(1.2)
      .ringRepeatPeriod(1500);

    // Initial Viewport Centered on India
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

  // Update country polygons when GeoJSON loads
  useEffect(() => {
    if (globeInstanceRef.current && countriesGeoJson) {
      globeInstanceRef.current
        .polygonsData(countriesGeoJson)
        .polygonCapColor(d => {
          const isIndia = d.properties.ISO_A2 === 'IN' || d.properties.ADMIN === 'India';
          return isIndia ? 'rgba(0, 242, 254, 0.09)' : 'rgba(15, 23, 42, 0.35)';
        })
        .polygonSideColor(() => 'rgba(0, 0, 0, 0.2)')
        .polygonStrokeColor(d => {
          const isIndia = d.properties.ISO_A2 === 'IN' || d.properties.ADMIN === 'India';
          return isIndia ? 'rgba(0, 242, 254, 0.75)' : 'rgba(148, 163, 184, 0.2)';
        })
        .polygonAltitude(0.005);
    }
  }, [countriesGeoJson]);

  // Update Points, Arcs, and Labels when data or filters change
  useEffect(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current
        .pointsData([...filteredLocations])
        .arcsData(geoData.arcs || [])
        .labelsData(labelsData)
        .ringsData(filteredLocations.filter(l => l.locationType === 'OPERATIONAL_SITE' || l.id === selectedLocationIdRef.current));
    }
  }, [filteredLocations, geoData.arcs, labelsData, selectedLocationId]);

  // Fly-to and focus camera when entity or location is selected
  useEffect(() => {
    if (!globeInstanceRef.current) return;

    if (activeLocation) {
      globeInstanceRef.current.pointOfView(
        { lat: activeLocation.latitude, lng: activeLocation.longitude, altitude: 0.65 },
        1400
      );
    }
  }, [activeLocation]);

  const handleRecenterIndia = () => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointOfView({ lat: 22.5, lng: 78.5, altitude: 1.8 }, 1200);
    }
  };

  const handleSelectLocation = (loc) => {
    setSelectedLocOverride(loc);
    selectLocation(loc.id);
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointOfView({ lat: loc.latitude, lng: loc.longitude, altitude: 0.65 }, 1200);
    }
  };

  // Associated events for active location
  const locationEvents = useMemo(() => {
    if (!activeLocation || !timelineEvents) return [];
    return timelineEvents.filter(e => 
      e.locationId === activeLocation.id || 
      (e.locationName && activeLocation.name && e.locationName.includes(activeLocation.city))
    );
  }, [activeLocation, timelineEvents]);

  // Associated entities for active location
  const associatedEntities = useMemo(() => {
    if (!activeLocation) return [];
    const entIds = new Set();
    if (activeLocation.entityId) entIds.add(activeLocation.entityId);
    if (Array.isArray(activeLocation.associatedEntityIds)) {
      activeLocation.associatedEntityIds.forEach(id => entIds.add(id));
    }
    return Array.from(entIds);
  }, [activeLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D Globe WebGL Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Left: Tactical Navigation & Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 15,
        }}
      >
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
                globeInstanceRef.current.pointOfView({ altitude: pov.altitude * 0.72 }, 400);
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
                globeInstanceRef.current.pointOfView({ altitude: pov.altitude * 1.38 }, 400);
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

      {/* Top Center: Operational Category Filter Pills */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 80,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 15,
        }}
      >
        <div className="glass-panel" style={{
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'auto',
          fontSize: '11px',
        }}>
          <Filter size={13} color="var(--accent-cyan)" />
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginRight: '4px' }}>FILTER:</span>
          {[
            { id: 'ALL', label: 'All Sites' },
            { id: 'OPERATIONAL_SITE', label: 'Operational' },
            { id: 'FINANCIAL_INSTITUTION', label: 'Financial / Hawala' },
            { id: 'TRANSIT_HUB', label: 'Transit Hubs' },
            { id: 'MEETING_POINT', label: 'Meeting Points' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setCategoryFilter(f.id)}
              style={{
                background: categoryFilter === f.id ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                border: categoryFilter === f.id ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                color: categoryFilter === f.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tactical Status Pill */}
        <div className="glass-panel" style={{
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'auto',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ color: 'var(--text-secondary)' }}>SITES: {filteredLocations.length} | ARCS: {geoData.arcs?.length || 0}</span>
        </div>
      </div>

      {/* Entity Multi-Location Quick Bar (Appears when selected target has multiple locations) */}
      {selectedEntity && entityLocations.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 64,
          left: 80,
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div className="glass-panel" style={{
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Crosshair size={13} color="var(--accent-gold)" />
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{selectedEntity.label}</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({entityLocations.length} SITES):</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {entityLocations.map(loc => {
                const isActive = activeLocation?.id === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    style={{
                      background: isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? '#000000' : 'var(--text-secondary)',
                      border: isActive ? '1px solid #00f2fe' : '1px solid var(--border-subtle)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    📍 {loc.city} ({loc.locationType.split('_')[0]})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Left: Location Intelligence Dossier Card */}
      {activeLocation && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          zIndex: 15,
          width: 380,
          maxWidth: 'calc(100vw - 40px)',
        }}>
          <div className="glass-panel-elevated" style={{
            padding: '16px',
            border: '1px solid var(--accent-cyan)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(16px)',
          }}>
            {/* Header Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge" style={{
                  background: 'rgba(0, 242, 254, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  fontSize: '10px',
                }}>
                  {TYPE_LABELS[activeLocation.locationType] || activeLocation.locationType}
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  {activeLocation.city.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                CONFIDENCE: {(activeLocation.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Site Name & Address */}
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
              {activeLocation.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {activeLocation.address || activeLocation.city}, {activeLocation.state ? `${activeLocation.state}, ` : ''}{activeLocation.country}
            </div>

            {/* Coordinates */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
            }}>
              <span style={{ color: 'var(--accent-cyan)' }}>
                LAT: {activeLocation.latitude.toFixed(4)}° N | LNG: {activeLocation.longitude.toFixed(4)}° E
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                ID: {activeLocation.id}
              </span>
            </div>

            {/* Associated Entities */}
            {associatedEntities.length > 0 && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ASSOCIATED TARGETS ({associatedEntities.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {associatedEntities.map(entId => {
                    const isSelected = selectedEntityId === entId;
                    return (
                      <button
                        key={entId}
                        onClick={() => selectEntity(entId)}
                        style={{
                          background: isSelected ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                          color: isSelected ? '#00f2fe' : '#e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <User size={11} color={isSelected ? '#00f2fe' : 'var(--text-muted)'} />
                        <span>{entId === 'PER-SULTAN-01' ? 'Sultan' : entId === 'PER-MUNSHI-02' ? 'Munshi' : entId}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Associated Events */}
            {locationEvents.length > 0 && (
              <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  INCIDENT TIMELINE ({locationEvents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {locationEvents.slice(0, 2).map(ev => (
                    <div key={ev.id} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                        {new Date(ev.timestamp).toLocaleDateString()}:
                      </span>{' '}
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case & Source Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '12px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '10px',
              color: 'var(--text-muted)',
            }}>
              <span>Case: {activeLocation.caseId || activeCase?.id || 'CASE-2024-VORTEX'}</span>
              <span>Source: {activeLocation.source || 'INVESTIGATION_LOG'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
