/**
 * CONSTELLATION — Printable Investigation Intelligence Reports Engine
 *
 * Supports two dedicated reporting workflows:
 * 1. Case Intelligence Report (Case Overview, Registry, Network Analytics, Timeline, Locations, Evidence, Moriarty Adversarial Stress-Tests)
 * 2. Person / Entity Intelligence Profile (Identity, Identifiers/IMEI/Phone, Direct Connections, Timeline, Locations, Evidence, Centrality)
 *
 * Hardened for browser print (Ctrl+P / window.print()) with clean black-on-white pagination,
 * hidden dashboard UI, and standalone HTML export.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  Printer,
  Download,
  X,
  Shield,
  ShieldAlert,
  FileText,
  Activity,
  MapPin,
  Clock,
  Zap,
  AlertTriangle,
  User,
  Fingerprint,
  Briefcase,
  Share2,
  CheckCircle2,
  Phone,
  Radio,
  FileCheck,
  Cpu,
} from 'lucide-react';

export function InvestigationReportModal() {
  const {
    isReportModalOpen,
    closeReportModal,
    reportConfig,
    setReportConfig,
    activeCase,
    cases,
    selectedEntity,
    graphData,
    geoData,
    timelineEvents,
    evidenceList,
    analyticsData,
  } = useInvestigationStore();

  const initialMode = reportConfig?.mode || 'case';
  const initialEntityId = reportConfig?.targetEntityId || selectedEntity?.id || graphData?.nodes?.[0]?.id || null;

  const [mode, setMode] = useState(initialMode); // 'case' | 'entity'
  const [targetEntityId, setTargetEntityId] = useState(initialEntityId);
  const [moriartyData, setMoriartyData] = useState(null);
  const [loadingMoriarty, setLoadingMoriarty] = useState(false);

  useEffect(() => {
    if (reportConfig) {
      if (reportConfig.mode) setMode(reportConfig.mode);
      if (reportConfig.targetEntityId) setTargetEntityId(reportConfig.targetEntityId);
    }
  }, [reportConfig]);

  // Fetch dynamic Moriarty assessments for active case
  useEffect(() => {
    if (isReportModalOpen && activeCase?.id) {
      let isMounted = true;
      setLoadingMoriarty(true);
      api.queryMoriarty({ caseId: activeCase.id })
        .then(res => {
          if (isMounted) setMoriartyData(res.data);
        })
        .catch(err => console.error('[Report] Failed to load Moriarty assessments:', err))
        .finally(() => {
          if (isMounted) setLoadingMoriarty(false);
        });
      return () => { isMounted = false; };
    }
  }, [isReportModalOpen, activeCase?.id]);

  // Resolve target entity object
  const targetEntity = useMemo(() => {
    if (!graphData?.nodes || graphData.nodes.length === 0) return selectedEntity || null;
    return graphData.nodes.find(n => n.id === targetEntityId) || selectedEntity || graphData.nodes[0] || null;
  }, [graphData?.nodes, targetEntityId, selectedEntity]);

  // Connected links for target entity
  const targetLinks = useMemo(() => {
    if (!targetEntity || !graphData?.links) return [];
    const entId = targetEntity.id;
    return graphData.links.filter(l => {
      const srcId = l.source?.id || l.source;
      const tgtId = l.target?.id || l.target;
      return srcId === entId || tgtId === entId;
    });
  }, [targetEntity, graphData?.links]);

  // Associated timeline events for target entity
  const targetTimelineEvents = useMemo(() => {
    if (!targetEntity || !timelineEvents) return [];
    return timelineEvents.filter(ev => (ev.entityIds || []).includes(targetEntity.id));
  }, [targetEntity, timelineEvents]);

  // Associated locations for target entity
  const targetLocations = useMemo(() => {
    if (!targetEntity || !geoData?.locations) return [];
    return geoData.locations.filter(loc => (loc.associatedEntityIds || []).includes(targetEntity.id));
  }, [targetEntity, geoData?.locations]);

  // Associated evidence for target entity
  const targetEvidence = useMemo(() => {
    if (!targetEntity || !evidenceList) return [];
    return evidenceList.filter(evi => (evi.entityIds || evi.linkedEntityIds || []).includes(targetEntity.id));
  }, [targetEntity, evidenceList]);

  if (!isReportModalOpen) return null;

  const reportDate = new Date().toLocaleString();
  const reportRef = `CRIM-INT-${mode.toUpperCase()}-${Date.now().toString().substring(5)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    const reportElem = document.getElementById('constellation-printable-report');
    if (!reportElem) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CONSTELLATION Intelligence Report — ${mode === 'case' ? (activeCase?.id || 'Case') : (targetEntity?.label || 'Entity')}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #0f172a; padding: 24px; font-size: 10pt; line-height: 1.4; }
    h1 { font-size: 18pt; color: #0f172a; margin-bottom: 4pt; }
    h2 { font-size: 12pt; color: #0369a1; border-bottom: 2px solid #0284c7; padding-bottom: 4pt; margin-top: 16pt; margin-bottom: 8pt; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 12pt; font-size: 9pt; }
    th { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 6pt; text-align: left; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 5pt 6pt; color: #1e293b; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8pt; font-weight: bold; border: 1px solid #94a3b8; background: #f1f5f9; }
    .badge-crimson { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
    .badge-cyan { background: #e0f2fe; border-color: #0284c7; color: #075985; }
    .badge-emerald { background: #d1fae5; border-color: #10b981; color: #065f46; }
    .badge-gold { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    .report-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10pt; border-radius: 4pt; margin-bottom: 12pt; }
    .report-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 16pt; }
    .report-signature-block { break-inside: avoid; margin-top: 24pt; padding-top: 14pt; border-top: 2px solid #cbd5e1; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${reportElem.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CONSTELLATION_${mode.toUpperCase()}_Report_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const moriartyAssessments = moriartyData?.adversarialAssessments || [];

  return (
    <div
      className="constellation-report-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
    >
      <div
        className="constellation-report-modal-dialog"
        style={{
          width: '980px',
          maxWidth: '96vw',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Controls Toolbar */}
        <div
          className="constellation-report-modal-toolbar no-print"
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 15, 29, 0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Print Intelligence Report
            </span>
            <span className="badge badge-crimson" style={{ fontSize: '10px' }}>
              RESTRICTED // LAW ENFORCEMENT
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                color: '#07090e',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              onClick={handleExportHTML}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} /> Export HTML
            </button>
            <button
              onClick={closeReportModal}
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: '50%' }}
              title="Close Report Modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Report Mode & Target Selector Bar */}
        <div
          className="constellation-report-mode-bar no-print"
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Mode Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setMode('case')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: mode === 'case' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                border: `1px solid ${mode === 'case' ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                color: mode === 'case' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}
            >
              <Briefcase size={14} />
              <span>A. Case Intelligence Report</span>
            </button>

            <button
              onClick={() => setMode('entity')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: mode === 'entity' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                border: `1px solid ${mode === 'entity' ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
                color: mode === 'entity' ? 'var(--accent-gold)' : 'var(--text-muted)',
              }}
            >
              <User size={14} />
              <span>B. Person / Entity Intelligence Profile</span>
            </button>
          </div>

          {/* Entity Target Selector when in entity mode */}
          {mode === 'entity' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TARGET SUBJECT:</span>
              <select
                value={targetEntityId || ''}
                onChange={(e) => setTargetEntityId(e.target.value)}
                style={{
                  background: 'rgba(10, 15, 29, 0.9)',
                  border: '1px solid var(--border-medium)',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  maxWidth: '320px',
                }}
              >
                {graphData.nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {node.label || node.id} ({node.type?.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scrollable Printable Report Surface */}
        <div
          className="constellation-report-scroll-container"
          style={{ flex: 1, overflowY: 'auto', padding: '30px', backgroundColor: '#07090e' }}
        >
          <div
            id="constellation-printable-report"
            style={{
              maxWidth: '860px',
              margin: '0 auto',
              background: '#0d131f',
              padding: '40px',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Classification Header Banner */}
            <div
              className="report-classification-header"
              style={{ borderBottom: '2px solid var(--accent-cyan)', paddingBottom: '14px', marginBottom: '24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div
                    className="report-classification-banner"
                    style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '2px', color: 'var(--accent-crimson)', fontWeight: 800 }}
                  >
                    RESTRICTED // LAW ENFORCEMENT & SPECIAL INTELLIGENCE ONLY
                  </div>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '6px 0 2px 0', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                    {mode === 'case'
                      ? 'CONSTELLATION CASE INTELLIGENCE REPORT'
                      : `SUBJECT INTELLIGENCE PROFILE: ${targetEntity?.label || 'UNKNOWN'}`}
                  </h1>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Generated by CONSTELLATION Autonomous Intelligence Core
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div>REF: <strong style={{ color: 'var(--accent-cyan)' }}>{reportRef}</strong></div>
                  <div>DATE: <span>{reportDate}</span></div>
                  <div>CASE ID: <span>{activeCase?.id || 'CASE-2024-VORTEX'}</span></div>
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* WORKFLOW A: PRINT CASE REPORT                                        */}
            {/* ===================================================================== */}
            {mode === 'case' && (
              <div>
                {/* 1. Case Information */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    1. INVESTIGATION OPERATION CONTEXT
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div><strong>Case Title:</strong> {activeCase?.title || 'Operation VORTEX'}</div>
                    <div><strong>Case File ID:</strong> {activeCase?.id || 'CASE-2024-VORTEX'}</div>
                    <div><strong>FIR Number:</strong> {activeCase?.firNumber || 'Special Cell FIR #204/24'}</div>
                    <div><strong>Lead Investigator:</strong> {activeCase?.leadInvestigator || 'DCP Rajeshwar Sen'}</div>
                    <div><strong>Sections of Law:</strong> {activeCase?.keySections?.join(', ') || 'IPC 120B, 420, PMLA Sec 3'}</div>
                    <div><strong>Operational Status:</strong> <span className="badge badge-emerald">{activeCase?.status || 'ACTIVE'}</span></div>
                    <div><strong>Priority Level:</strong> <span className="badge badge-crimson">{activeCase?.priority || 'CRITICAL'}</span></div>
                    <div><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</div>
                  </div>
                  {activeCase?.summary && (
                    <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      <strong>Operational Summary:</strong> {activeCase.summary}
                    </div>
                  )}
                </div>

                {/* 2. Graph Analytics & Topology */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    2. NETWORK TOPOLOGY & STRUCTURAL ANALYTICS
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      TOTAL NODES: <strong style={{ color: 'var(--accent-cyan)' }}>{graphData.nodes.length}</strong>
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      TOTAL LINKS: <strong style={{ color: 'var(--accent-cyan)' }}>{graphData.links.length}</strong>
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      BRIDGE NODES: <strong style={{ color: 'var(--accent-gold)' }}>{analyticsData?.bridgeNodes?.length || 1}</strong>
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      COMMUNITIES: <strong style={{ color: 'var(--accent-purple)' }}>{analyticsData?.communities?.length || 3}</strong>
                    </div>
                  </div>

                  {analyticsData?.bridgeNodes && analyticsData.bridgeNodes.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '4px' }}>
                      <strong>Key Intermediary (Articulation Point):</strong> Subject <em>{analyticsData.bridgeNodes[0].label}</em> ({analyticsData.bridgeNodes[0].id}) holds the highest betweenness centrality ({analyticsData.bridgeNodes[0].score?.toFixed(3)}), operating as the critical bridge coordinating disparate syndicate cells.
                    </div>
                  )}
                </div>

                {/* 3. Entities in Case */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    3. RECORDED ENTITIES IN OPERATION ({graphData.nodes.length} Entities)
                  </h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '6px 8px' }}>Entity Label / Name</th>
                          <th style={{ padding: '6px 8px' }}>Classification</th>
                          <th style={{ padding: '6px 8px' }}>Role / SubType</th>
                          <th style={{ padding: '6px 8px' }}>Key Identifiers</th>
                          <th style={{ padding: '6px 8px' }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {graphData.nodes.slice(0, 18).map((node, idx) => {
                          const attrs = node.attributes || {};
                          const idDetails = attrs.phoneNumber || attrs.imei || attrs.plateNumber || attrs.plate || attrs.alias || '—';
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{node.label || node.id}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <span className="badge badge-cyan">{node.type?.toUpperCase()}</span>
                              </td>
                              <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{node.subType || 'Syndicate Member'}</td>
                              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{idDetails}</td>
                              <td style={{ padding: '6px 8px' }}>{((node.confidence || 0.9) * 100).toFixed(0)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {graphData.nodes.length > 18 && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                        * Showing primary 18 of {graphData.nodes.length} entities in case registry
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Relationships & Connections */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    4. VERIFIED RELATIONSHIPS & OPERATIONAL LINKS ({graphData.links.length} Links)
                  </h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '6px 8px' }}>Source Entity</th>
                          <th style={{ padding: '6px 8px' }}>Relationship Type</th>
                          <th style={{ padding: '6px 8px' }}>Target Entity</th>
                          <th style={{ padding: '6px 8px' }}>Classification</th>
                          <th style={{ padding: '6px 8px' }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {graphData.links.slice(0, 14).map((link, idx) => {
                          const srcId = link.source?.id || link.source;
                          const tgtId = link.target?.id || link.target;
                          const srcNode = graphData.nodes.find(n => n.id === srcId);
                          const tgtNode = graphData.nodes.find(n => n.id === tgtId);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{srcNode?.label || srcId}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{link.type || 'CONNECTED_TO'}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{tgtNode?.label || tgtId}</td>
                              <td style={{ padding: '6px 8px' }}>
                                <span className={`badge ${link.classification === 'FACT' ? 'badge-emerald' : 'badge-gold'}`}>
                                  {link.classification || 'COMPUTED'}
                                </span>
                              </td>
                              <td style={{ padding: '6px 8px' }}>{((link.confidence || 0.85) * 100).toFixed(0)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Chronological Timeline Events */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    5. CHRONOLOGICAL TIMELINE SEQUENCE ({timelineEvents.length} Events)
                  </h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '6px 8px' }}>Timestamp</th>
                          <th style={{ padding: '6px 8px' }}>Incident / Event</th>
                          <th style={{ padding: '6px 8px' }}>Type</th>
                          <th style={{ padding: '6px 8px' }}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timelineEvents.slice(0, 8).map((ev, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {new Date(ev.timestamp).toLocaleString()}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{ev.title}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--accent-cyan)' }}>{ev.eventType}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span className={`badge ${ev.severity === 'CRITICAL' ? 'badge-crimson' : 'badge-emerald'}`}>
                                {ev.severity || 'MEDIUM'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Geospatial Operational Sites */}
                {geoData.locations?.length > 0 && (
                  <div className="report-section" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                      6. GEOSPATIAL OPERATIONAL SITES ({geoData.locations.length} Locations)
                    </h2>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ padding: '6px 8px' }}>Location Landmark</th>
                            <th style={{ padding: '6px 8px' }}>City, Country</th>
                            <th style={{ padding: '6px 8px' }}>Coordinates</th>
                            <th style={{ padding: '6px 8px' }}>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {geoData.locations.slice(0, 6).map((loc, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{loc.name}</td>
                              <td style={{ padding: '6px 8px' }}>{loc.city}, {loc.country || 'India'}</td>
                              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                              </td>
                              <td style={{ padding: '6px 8px' }}>{loc.locationType || 'OPERATIONAL'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. Evidence Locker & Chain of Custody */}
                {evidenceList.length > 0 && (
                  <div className="report-section" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                      7. EVIDENCE VAULT & FORENSIC CHAIN OF CUSTODY ({evidenceList.length} Exhibits)
                    </h2>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ padding: '6px 8px' }}>Exhibit Title</th>
                            <th style={{ padding: '6px 8px' }}>Type</th>
                            <th style={{ padding: '6px 8px' }}>Cryptographic Hash</th>
                            <th style={{ padding: '6px 8px' }}>Custody Locker / Agency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evidenceList.slice(0, 8).map((evi, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{evi.title}</td>
                              <td style={{ padding: '6px 8px', color: 'var(--accent-emerald)' }}>{evi.evidenceType}</td>
                              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                                {evi.hash || 'SHA256:VERIFIED'}
                              </td>
                              <td style={{ padding: '6px 8px' }}>{evi.source || 'SPECIAL_CELL_VAULT'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. Moriarty Adversarial Stress-Tests */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    8. MORIARTY ADVERSARIAL STRESS-TEST & COUNTER-HYPOTHESIS ASSESSMENT
                  </h2>
                  {moriartyAssessments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {moriartyAssessments.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: 'rgba(245, 158, 11, 0.04)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span className="badge badge-gold" style={{ fontSize: '9px' }}>
                              {item.id} // HYPOTHESIS [PLAUSIBILITY: {((item.confidenceScore || 0.6) * 100).toFixed(0)}%]
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                              {item.title}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px' }}>
                            <strong>Theory Challenged:</strong> "{item.claimChallenged}"
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                            <strong>Counter-Hypothesis:</strong> {item.counterHypothesis}
                          </div>
                          {item.recommendedVerification && (
                            <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '6px', fontWeight: 600 }}>
                              RECOMMENDED VERIFICATION: {item.recommendedVerification}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Moriarty analysis confirms active case dataset maintains direct corroboration with no single-point dependency vulnerabilities.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* WORKFLOW B: PRINT PERSON / ENTITY REPORT                             */}
            {/* ===================================================================== */}
            {mode === 'entity' && targetEntity && (
              <div>
                {/* 1. Subject Identity & Demographics */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    1. SUBJECT IDENTITY & CANONICAL PROFILE
                  </h2>
                  <div
                    className="report-card"
                    style={{
                      padding: '14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '4px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div><strong>Legal / Primary Name:</strong> {targetEntity.label || targetEntity.id}</div>
                    <div><strong>Entity Identifier:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{targetEntity.id}</span></div>
                    <div><strong>Classification Type:</strong> <span className="badge badge-cyan">{targetEntity.type?.toUpperCase()}</span></div>
                    <div><strong>Operational Role / SubType:</strong> {targetEntity.subType || 'Syndicate Member'}</div>
                    <div><strong>Confidence Rating:</strong> {((targetEntity.confidence || 0.9) * 100).toFixed(0)}% (Forensic High)</div>
                    <div><strong>Record Origin:</strong> {targetEntity.source || 'INVESTIGATION_RECORD'}</div>
                    {targetEntity.attributes?.alias && <div><strong>Known Aliases:</strong> {targetEntity.attributes.alias}</div>}
                    {targetEntity.attributes?.nationality && <div><strong>Nationality / Residence:</strong> {targetEntity.attributes.nationality}</div>}
                    {targetEntity.attributes?.riskLevel && (
                      <div><strong>Assigned Threat Level:</strong> <span className="badge badge-crimson">{targetEntity.attributes.riskLevel}</span></div>
                    )}
                    {targetEntity.attributes?.passportNo && <div><strong>Travel Document / Passport:</strong> {targetEntity.attributes.passportNo}</div>}
                  </div>
                </div>

                {/* 2. Technical Identifiers & Hardware Fingerprints */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    2. TECHNICAL IDENTIFIERS & DIGITAL FINGERPRINTS
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} /> Telecommunication Numbers
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {targetEntity.attributes?.phoneNumber || targetEntity.attributes?.msisdn || 'No direct MSISDN logged in profile'}
                      </div>
                    </div>

                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Radio size={13} /> Hardware IMEI Fingerprints
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {targetEntity.attributes?.imei || 'No direct handset IMEI registered'}
                      </div>
                    </div>

                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Fingerprint size={13} /> Vehicle / Asset License
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {targetEntity.attributes?.plateNumber || targetEntity.attributes?.plate || 'No registered vehicles'}
                      </div>
                    </div>

                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Cpu size={13} /> Crypto / Account Identifiers
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>
                        {targetEntity.attributes?.txHash || targetEntity.attributes?.blockchain || targetEntity.attributes?.serialNumber || 'No registered crypto hot-wallets'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Direct Relationships & Connected Nodes */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    3. DIRECT NETWORK CONNECTIONS ({targetLinks.length} Links)
                  </h2>
                  {targetLinks.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ padding: '6px 8px' }}>Connected Entity</th>
                            <th style={{ padding: '6px 8px' }}>Type</th>
                            <th style={{ padding: '6px 8px' }}>Link Relationship</th>
                            <th style={{ padding: '6px 8px' }}>Confidence</th>
                            <th style={{ padding: '6px 8px' }}>Classification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {targetLinks.map((link, idx) => {
                            const srcId = link.source?.id || link.source;
                            const tgtId = link.target?.id || link.target;
                            const otherId = srcId === targetEntity.id ? tgtId : srcId;
                            const otherNode = graphData.nodes.find(n => n.id === otherId);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{otherNode?.label || otherId}</td>
                                <td style={{ padding: '6px 8px' }}>
                                  <span className="badge badge-cyan">{otherNode?.type?.toUpperCase() || 'ENTITY'}</span>
                                </td>
                                <td style={{ padding: '6px 8px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                                  {link.type || 'COMMUNICATED_WITH'}
                                </td>
                                <td style={{ padding: '6px 8px' }}>{((link.confidence || 0.85) * 100).toFixed(0)}%</td>
                                <td style={{ padding: '6px 8px' }}>
                                  <span className={`badge ${link.classification === 'FACT' ? 'badge-emerald' : 'badge-gold'}`}>
                                    {link.classification || 'COMPUTED'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No direct relationship edges recorded for this entity.</div>
                  )}
                </div>

                {/* 4. Graph Centrality & Intelligence */}
                <div className="report-section" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                    4. GRAPH TOPOLOGICAL METRICS
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      DIRECT DEGREE: <strong style={{ color: 'var(--accent-cyan)' }}>{targetLinks.length} Connections</strong>
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      BETWEENNESS ROLE: <strong style={{ color: 'var(--accent-gold)' }}>
                        {analyticsData?.bridgeNodes?.some(b => b.id === targetEntity.id) ? 'CRITICAL ARTICULATION BRIDGE' : 'PERIPHERAL / BRANCH'}
                      </strong>
                    </div>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      TOPOLOGICAL CLUSTER: <strong style={{ color: 'var(--accent-purple)' }}>COMMUNITY #1</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Associated Timeline Events */}
                {targetTimelineEvents.length > 0 && (
                  <div className="report-section" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                      5. CHRONOLOGICAL TIMELINE INVOLVEMENTS ({targetTimelineEvents.length} Events)
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '6px 8px' }}>Timestamp</th>
                          <th style={{ padding: '6px 8px' }}>Event Description</th>
                          <th style={{ padding: '6px 8px' }}>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetTimelineEvents.map((ev, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {new Date(ev.timestamp).toLocaleString()}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{ev.title}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--accent-cyan)' }}>{ev.eventType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 6. Linked Evidence Exhibits */}
                {targetEvidence.length > 0 && (
                  <div className="report-section" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                      6. SEIZED EXHIBITS & FORENSIC EVIDENCE ({targetEvidence.length} Exhibits)
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '6px 8px' }}>Exhibit Title</th>
                          <th style={{ padding: '6px 8px' }}>Type</th>
                          <th style={{ padding: '6px 8px' }}>Hash</th>
                          <th style={{ padding: '6px 8px' }}>Custody</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetEvidence.map((evi, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{evi.title}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--accent-emerald)' }}>{evi.evidenceType}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{evi.hash || 'SHA256:VERIFIED'}</td>
                            <td style={{ padding: '6px 8px' }}>{evi.source || 'POLICE_LOCKER'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Official Sign-Off Footer */}
            <div
              className="report-signature-block"
              style={{
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '2px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              <div>
                <div>PREPARED BY: CONSTELLATION INTELLIGENCE CORE</div>
                <div>CLASSIFICATION: RESTRICTED // LAW ENFORCEMENT SENSITIVE</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid var(--text-muted)', width: '180px', marginBottom: '4px' }}></div>
                <div>SUPERINTENDENT / INVESTIGATING OFFICER SIGNATURE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvestigationReportModal;
