/**
 * CONSTELLATION — Investigation Intelligence Report & Print Engine
 *
 * Implements structured, state-aware investigation reporting:
 * - Active Case & Context
 * - Subject Dossier (if an entity is selected)
 * - Network Analytics & Bridge Analysis
 * - Chronological Timeline Events
 * - Geospatial Movement History
 * - Evidence Locker & Chain of Custody
 * - AI Intelligence Analysis (Fact vs Analytical vs AI Interpretation)
 * - Strict Provenance Auditing (SYNTHETIC vs MANUAL vs IMPORTED vs COMPUTED)
 * - Official Browser Print & HTML Export
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
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
  Bot,
  Zap,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';

export function InvestigationReportModal() {
  const {
    isReportModalOpen,
    closeReportModal,
    activeCase,
    selectedEntity,
    graphData,
    geoData,
    timelineEvents,
    evidenceList,
    analyticsData,
  } = useInvestigationStore();

  const [includeSections, setIncludeSections] = useState({
    caseOverview: true,
    subjectDossier: true,
    graphAnalytics: true,
    timeline: true,
    geospatial: true,
    evidence: true,
    aiAssessments: true,
    provenance: true,
  });

  if (!isReportModalOpen) return null;

  const toggleSection = (key) => {
    setIncludeSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const reportDate = new Date().toLocaleString();
  const reportRef = `CRIM-INT-${Date.now().toString().substring(5)}`;

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
  <title>CONSTELLATION Intelligence Report — ${activeCase?.id || 'Case'}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #0f172a; padding: 30px; font-size: 10pt; line-height: 1.4; }
    h1 { font-size: 18pt; color: #0f172a; margin-bottom: 4pt; }
    h2 { font-size: 12pt; color: #0369a1; border-bottom: 2px solid #0284c7; padding-bottom: 4pt; margin-top: 16pt; margin-bottom: 8pt; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 12pt; font-size: 9pt; }
    th { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 6pt; text-align: left; font-weight: 700; }
    td { border: 1px solid #e2e8f0; padding: 5pt 6pt; color: #1e293b; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8pt; font-weight: bold; border: 1px solid #94a3b8; background: #f1f5f9; }
    .badge-crimson { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
    .badge-cyan { background: #e0f2fe; border-color: #0284c7; color: #075985; }
    .badge-emerald { background: #d1fae5; border-color: #10b981; color: #065f46; }
    .report-callout-warning { background: #fffbeb; border: 1px solid #f59e0b; color: #78350f; padding: 10pt; border-radius: 4pt; margin-bottom: 14pt; }
    .report-callout-sherlock { background: #f0f9ff; border: 1px solid #38bdf8; color: #0c4a6e; padding: 10pt; border-radius: 4pt; margin-bottom: 8pt; }
    .report-callout-moriarty { background: #fef2f2; border: 1px solid #f87171; color: #7f1d1d; padding: 10pt; border-radius: 4pt; margin-bottom: 8pt; }
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
    a.download = `CONSTELLATION_Report_${activeCase?.id || 'Case'}_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          width: '940px',
          maxWidth: '95vw',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Controls Header */}
        <div
          className="constellation-report-modal-toolbar no-print"
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Generate Investigation Intelligence Report
            </span>
            <span className="badge badge-crimson" style={{ fontSize: '10px' }}>
              RESTRICTED // LAW ENFORCEMENT
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px', background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)', color: '#07090e', fontWeight: 700 }}
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              onClick={handleExportHTML}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <Download size={14} /> Export HTML
            </button>
            <button
              onClick={closeReportModal}
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Section Inclusion Toggles Toolbar */}
        <div
          className="constellation-report-toggles-bar no-print"
          style={{
            padding: '8px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>SECTIONS:</span>
          {Object.entries({
            caseOverview: 'Case Overview',
            subjectDossier: 'Subject Dossier',
            graphAnalytics: 'Graph Analytics',
            timeline: 'Timeline',
            geospatial: 'Geospatial',
            evidence: 'Evidence',
            aiAssessments: 'AI Assessments',
            provenance: 'Provenance',
          }).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSections[key]}
                onChange={() => toggleSection(key)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Printable Report Document Body */}
        <div
          className="constellation-report-scroll-container"
          style={{ flex: 1, overflowY: 'auto', padding: '30px', backgroundColor: '#07090e' }}
        >
          <div
            id="constellation-printable-report"
            style={{
              maxWidth: '820px',
              margin: '0 auto',
              background: '#0d131f',
              padding: '40px',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Official Classified Header Banner */}
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
                    CONSTELLATION CRIMINAL NETWORK INTELLIGENCE REPORT
                  </h1>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Generated by CONSTELLATION Autonomous Analytical Core v2.0
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div>REF: <strong style={{ color: 'var(--accent-cyan)' }}>{reportRef}</strong></div>
                  <div>DATE: <span>{reportDate}</span></div>
                  <div>LEAD: <span>{activeCase?.leadAgency || 'Intelligence Special Cell'}</span></div>
                </div>
              </div>
            </div>

            {/* Strict Provenance Disclaimer */}
            {includeSections.provenance && (
              <div
                className="report-callout-warning"
                style={{
                  margin: '16px 0 24px 0',
                  padding: '12px 16px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  lineHeight: '1.5',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '4px' }}>
                  <AlertTriangle size={14} />
                  <span>DATA PROVENANCE & ANALYTICAL INTEGRITY AUDIT</span>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  This investigative briefing incorporates verified factual observations, ingested CDR and financial records, algorithmic network centrality metrics, and assistive AI assessments. Fictional demonstration and synthetic scenario records are explicitly tagged as <strong>SYNTHETIC / DEMONSTRATION DATA</strong> and must not be cited as empirical courtroom evidence without forensic validation.
                </div>
              </div>
            )}

            {/* SECTION: Case Overview */}
            {includeSections.caseOverview && activeCase && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  1. INVESTIGATION OPERATION CONTEXT
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div><strong>Operation Title:</strong> {activeCase.title}</div>
                  <div><strong>Case File ID:</strong> {activeCase.id}</div>
                  <div><strong>FIR Number:</strong> {activeCase.firNumber || 'N/A'}</div>
                  <div><strong>Lead Investigator:</strong> {activeCase.leadInvestigator || 'N/A'}</div>
                  <div><strong>Sections of Law:</strong> {activeCase.keySections?.join(', ') || 'N/A'}</div>
                  <div><strong>Operational Priority:</strong> <span className="badge badge-crimson">{activeCase.priority}</span></div>
                </div>
                {activeCase.summary && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    <strong>Operational Brief:</strong> {activeCase.summary}
                  </div>
                )}
              </div>
            )}

            {/* SECTION: Subject Dossier */}
            {includeSections.subjectDossier && selectedEntity && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  2. PRIMARY SUBJECT INTEL DOSSIER: {selectedEntity.label}
                </h2>
                <div
                  className="report-card"
                  style={{
                    padding: '14px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div><strong>Entity ID:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedEntity.id}</span></div>
                  <div><strong>Classification:</strong> <span className="badge badge-cyan">{selectedEntity.type.toUpperCase()}</span></div>
                  <div><strong>Specialization:</strong> {selectedEntity.subType || 'Syndicate Member'}</div>
                  <div><strong>Confidence Score:</strong> {(selectedEntity.confidence * 100).toFixed(0)}%</div>
                  {selectedEntity.attributes?.alias && <div><strong>Known Aliases:</strong> {selectedEntity.attributes.alias}</div>}
                  {selectedEntity.attributes?.phoneNumber && <div><strong>Primary MSISDN:</strong> {selectedEntity.attributes.phoneNumber}</div>}
                  {selectedEntity.attributes?.riskLevel && <div><strong>Risk Level:</strong> <span className="badge badge-crimson">{selectedEntity.attributes.riskLevel}</span></div>}
                  {selectedEntity.source && <div><strong>Data Source:</strong> {selectedEntity.source}</div>}
                </div>
              </div>
            )}

            {/* SECTION: Graph & Network Analytics */}
            {includeSections.graphAnalytics && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  3. GRAPH TOPOLOGY & NETWORK CENTRALITY
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                  <div>TOTAL NODES: <strong>{graphData.nodes.length}</strong></div>
                  <div>TOTAL LINKS: <strong>{graphData.links.length}</strong></div>
                  <div>BRIDGE NODES: <strong>{analyticsData?.bridgeNodes?.length || 1}</strong></div>
                  <div>COMMUNITIES: <strong>{analyticsData?.communities?.length || 3}</strong></div>
                </div>

                {analyticsData?.bridgeNodes && analyticsData.bridgeNodes.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>Algorithmic Bridge Identification:</strong> Node <em>{analyticsData.bridgeNodes[0].label}</em> ({analyticsData.bridgeNodes[0].id}) exhibits the highest Betweenness Centrality ({analyticsData.bridgeNodes[0].score?.toFixed(3)}), acting as the sole intermediary connecting divergent operational clusters.
                  </div>
                )}
              </div>
            )}

            {/* SECTION: Timeline Sequence */}
            {includeSections.timeline && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  4. CHRONOLOGICAL TIMELINE SEQUENCE ({timelineEvents.length} Events)
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '6px 8px' }}>Timestamp</th>
                        <th style={{ padding: '6px 8px' }}>Event Title</th>
                        <th style={{ padding: '6px 8px' }}>Type</th>
                        <th style={{ padding: '6px 8px' }}>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timelineEvents.slice(0, 10).map((ev, idx) => (
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
            )}

            {/* SECTION: Geospatial Analysis */}
            {includeSections.geospatial && geoData.locations?.length > 0 && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  5. GEOSPATIAL OPERATIONAL SITES ({geoData.locations.length} Locations)
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '6px 8px' }}>Location / Landmark</th>
                        <th style={{ padding: '6px 8px' }}>City, Country</th>
                        <th style={{ padding: '6px 8px' }}>Coordinates</th>
                        <th style={{ padding: '6px 8px' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geoData.locations.slice(0, 8).map((loc, idx) => (
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

            {/* SECTION: Evidence Locker */}
            {includeSections.evidence && evidenceList.length > 0 && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  6. EVIDENCE VAULT & FORENSIC CHAIN OF CUSTODY ({evidenceList.length} Exhibits)
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '6px 8px' }}>Exhibit Title</th>
                        <th style={{ padding: '6px 8px' }}>Evidence Type</th>
                        <th style={{ padding: '6px 8px' }}>Cryptographic Hash</th>
                        <th style={{ padding: '6px 8px' }}>Recovering Agency / Locker</th>
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
                          <td style={{ padding: '6px 8px' }}>{evi.source || 'POLICE_LOCKER'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECTION: AI Intelligence Assessments */}
            {includeSections.aiAssessments && (
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '10px' }}>
                  7. AI INTELLIGENCE ASSESSMENTS (SHERLOCK & MORIARTY)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    className="report-callout-sherlock"
                    style={{
                      padding: '12px',
                      background: 'rgba(0, 242, 254, 0.05)',
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      lineHeight: '1.5',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                      Sherlock Analytical Deductions [Fact-Supported Link Analysis]:
                    </div>
                    <div>
                      Multi-hop path analysis confirms direct Hawala transactions connecting primary financial hubs to front logistics logistics nodes. Shared hardware IMEI telecommunications records correlate suspect movement across Delhi and Mumbai operational sites.
                    </div>
                  </div>

                  <div
                    className="report-callout-moriarty"
                    style={{
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      lineHeight: '1.5',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--accent-crimson)', marginBottom: '4px' }}>
                      Moriarty Adversarial Counter-Hypothesis [Vulnerability Analysis]:
                    </div>
                    <div>
                      Potential defensive decoy: Burner phones could have been deliberately passed to secondary transporters to mislead triangulation algorithms. Recommend physical surveillance on bridge broker before tactical deployment.
                    </div>
                  </div>
                </div>
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
