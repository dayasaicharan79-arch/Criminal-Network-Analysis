/**
 * CONSTELLATION — God's Eye Investigation Mode
 * 
 * Interactive, data-driven investigation walkthrough showing the chronological
 * case narrative with synchronized 3D graph and geographic focus.
 */
import React, { useState, useEffect } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  MapPin,
  Share2,
  FileText,
  ShieldAlert,
  Compass,
} from 'lucide-react';

const CINEMA_STEPS = [
  {
    step: 1,
    title: 'Statutory Criminal Case Registered',
    subtitle: 'Special Cell Intelligence Division — Lodhi Colony, New Delhi',
    entityId: 'DOC-FIR-204',
    locationId: 'LOC-DELHI-01',
    description: 'First Information Report #204/2024 is registered under IPC 120B (Criminal Conspiracy) and PMLA Section 3 following confidential intelligence on a multi-state hawala financing network.',
    badge: 'ACT I: INITIATION',
    badgeColor: 'badge-cyan',
  },
  {
    step: 2,
    title: 'Overseas Command & Kingpin Identified',
    subtitle: 'Dubai Multi Commodities Centre (DMCC), UAE',
    entityId: 'PER-SULTAN-01',
    locationId: 'LOC-DUBAI-03',
    description: 'Intelligence intercepts tie primary operational financing to Tariq "Sultan" Mansoor operating through Al-Noor Diamonds DMCC in Dubai. Red Corner notice requested via Interpol.',
    badge: 'ACT II: SYNDICATE APEX',
    badgeColor: 'badge-crimson',
  },
  {
    step: 3,
    title: 'Algorithmic Graph Topology Identifies Financial Bridge',
    subtitle: 'Zaveri Bazaar Hawala Hub, Mumbai',
    entityId: 'PER-MUNSHI-02',
    locationId: 'LOC-MUMBAI-02',
    description: 'Graph betweenness centrality pinpoints Karan "Munshi" Verma as the crucial articulation cut-vertex connecting overseas offshore accounts to ground logistics in India.',
    badge: 'ACT III: TOPOLOGICAL DISCOVERY',
    badgeColor: 'badge-gold',
  },
  {
    step: 4,
    title: 'Physical Cash Consignment Intercepted via ANPR',
    subtitle: 'DND Flyway Corridor, Delhi-NCR',
    entityId: 'VEH-SCORPIO-01',
    locationId: 'LOC-DELHI-01',
    description: 'Automated Number Plate Recognition cameras tag Mahindra Scorpio DL-10-CA-4491 driven by Vikram "Blade" Malhotra carrying ₹4.2 Crores in cash tokens toward South Delhi.',
    badge: 'ACT IV: GROUND INTERDICTION',
    badgeColor: 'badge-gold',
  },
  {
    step: 5,
    title: 'Tactical Raid & Evidence Recovery',
    subtitle: 'South Extension Safehouse, New Delhi',
    entityId: 'PER-BLADE-03',
    locationId: 'LOC-DELHI-01',
    description: 'Special Cell tactical team breaches D-42 South Extension. Vikram Malhotra apprehended; ₹4.2 Crore cash, Trezor hardware cold wallet, and burner handsets seized under panchnama.',
    badge: 'ACT V: TACTICAL SEIZURE',
    badgeColor: 'badge-crimson',
  },
  {
    step: 6,
    title: 'Hardware Anomaly Links Cyber Cell to Safehouse',
    subtitle: 'Indiranagar Tech Corridor, Bengaluru',
    entityId: 'PHO-CYBER-04',
    locationId: 'LOC-BLR-04',
    description: 'Certified Section 65B telecom forensics discover that handset IMEI 86420904011234 recovered in Delhi was previously authenticated on a Bengaluru automated crypto payment relay.',
    badge: 'ACT VI: FORENSIC CORRELATION',
    badgeColor: 'badge-purple',
  },
  {
    step: 7,
    title: 'Case Resolution & Judicial Provenance Chain',
    subtitle: 'Patiala House Special Court, New Delhi',
    entityId: 'PER-SULTAN-01',
    locationId: 'LOC-DELHI-01',
    description: 'All 20 relationships, 8 locations, and 5 primary physical exhibits have complete cryptographic SHA-256 integrity hashes and verifiable chain-of-custody logs.',
    badge: 'ACT VII: PROSECUTORIAL READINESS',
    badgeColor: 'badge-emerald',
  },
];

export function GodsEyeCinemaMode() {
  const {
    stopCinemaMode,
    selectEntity,
    selectLocation,
    setActiveView,
  } = useInvestigationStore();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentStep = CINEMA_STEPS[currentStepIdx];

  // Auto-advance timer
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStepIdx < CINEMA_STEPS.length - 1) {
          setCurrentStepIdx(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx]);

  // Synchronize active step with canonical investigation state
  useEffect(() => {
    if (currentStep) {
      if (currentStep.entityId) selectEntity(currentStep.entityId);
      if (currentStep.locationId) selectLocation(currentStep.locationId);
    }
  }, [currentStepIdx]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(7, 9, 14, 0.94)',
      backdropFilter: 'blur(20px)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '32px',
    }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Compass size={18} color="#07090e" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.5px' }}>
              GOD'S EYE INVESTIGATION TOUR
            </div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              AUTONOMOUS INVESTIGATIVE RECONSTRUCTION // STEP {currentStep.step} OF {CINEMA_STEPS.length}
            </div>
          </div>
        </div>

        <button
          onClick={stopCinemaMode}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', color: '#f8fafc' }}
        >
          <X size={16} />
          <span>Exit Guided Mode</span>
        </button>
      </div>

      {/* Center Cinematic Card */}
      <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '14px' }}>
          <span className={`badge ${currentStep.badgeColor}`} style={{ fontSize: '12px', padding: '4px 12px' }}>
            {currentStep.badge}
          </span>
        </div>

        <h1 style={{
          fontSize: '34px',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          color: '#ffffff',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
        }}>
          {currentStep.title}
        </h1>

        <div style={{
          fontSize: '14px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-cyan)',
          marginTop: '8px',
        }}>
          📍 {currentStep.subtitle}
        </div>

        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          marginTop: '18px',
          lineHeight: '1.6',
          maxWidth: '680px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          {currentStep.description}
        </p>

        {/* Step Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '28px' }}>
          {CINEMA_STEPS.map((s, idx) => (
            <div
              key={s.step}
              onClick={() => setCurrentStepIdx(idx)}
              style={{
                width: currentStepIdx === idx ? '32px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: currentStepIdx === idx ? 'var(--accent-cyan)' : 'var(--border-medium)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Playback Controls */}
      <div style={{
        maxWidth: '520px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '12px',
        background: 'rgba(14, 19, 31, 0.8)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-medium)',
      }}>
        <button
          onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
          className="btn btn-ghost"
          disabled={currentStepIdx === 0}
          style={{ padding: '8px 12px' }}
        >
          <SkipBack size={16} />
          <span>Previous</span>
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="btn btn-primary"
          style={{ padding: '8px 20px' }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isPlaying ? 'Pause Tour' : 'Resume Tour'}</span>
        </button>

        <button
          onClick={() => setCurrentStepIdx(prev => Math.min(CINEMA_STEPS.length - 1, prev + 1))}
          className="btn btn-ghost"
          disabled={currentStepIdx === CINEMA_STEPS.length - 1}
          style={{ padding: '8px 12px' }}
        >
          <span>Next</span>
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  );
}
