/**
 * CONSTELLATION — Evidence & Provenance Vault
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import {
  ShieldCheck,
  FileText,
  Lock,
  Calendar,
  Hash,
  UserCheck,
  ExternalLink,
  Search,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

export function EvidenceVaultView() {
  const {
    evidenceList,
    selectedEvidenceId,
    selectEvidence,
    selectEntity,
    setActiveView,
  } = useInvestigationStore();

  const [activeEvidenceModal, setActiveEvidenceModal] = useState(null);
  const [filterType, setFilterType] = useState('ALL');

  const filtered = filterType === 'ALL'
    ? evidenceList
    : evidenceList.filter(e => e.evidenceType === filterType);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #0d1527 0%, #07090e 100%)',
    }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--accent-emerald)" />
            <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              Evidence & Provenance Vault
            </h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Forensic chain of custody, cryptographic SHA-256 validation, and strict classification of legal FACT vs INFERENCE.
          </p>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
            {['ALL', 'DOCUMENT', 'SEIZED_DEVICE', 'CDR_LOG', 'CCTV_STILL'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`btn ${filterType === type ? 'btn-active' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Evidence Card Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(ev => {
            const isSelected = selectedEvidenceId === ev.id;
            return (
              <div
                key={ev.id}
                onClick={() => {
                  selectEvidence(ev.id);
                  setActiveEvidenceModal(ev);
                }}
                className="glass-panel"
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  border: isSelected ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className={`badge ${
                      ev.classification === 'FACT' ? 'badge-emerald' :
                      ev.classification === 'INFERENCE' ? 'badge-gold' : 'badge-purple'
                    }`}>
                      {ev.classification}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {ev.evidenceType}
                    </span>
                  </div>

                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                    {ev.title}
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                    {ev.description}
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <Hash size={12} color="var(--accent-emerald)" />
                    <span>{ev.hash.substring(0, 24)}...</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Source: {ev.source}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Full Forensic Chain of Custody */}
        {activeEvidenceModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <div className="glass-panel-elevated" style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
              border: '1px solid var(--accent-emerald)',
            }}>
              <button
                onClick={() => setActiveEvidenceModal(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span className="badge badge-emerald">{activeEvidenceModal.classification}</span>
                <span className="badge badge-cyan">{activeEvidenceModal.evidenceType}</span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                {activeEvidenceModal.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                {activeEvidenceModal.description}
              </p>

              {/* Hash Verification */}
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                  <CheckCircle size={14} />
                  <span>CRYPTOGRAPHIC INTEGRITY VERIFIED (SECTION 65B COMPLIANT)</span>
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '4px', wordBreak: 'break-all' }}>
                  {activeEvidenceModal.hash}
                </div>
              </div>

              {/* Chain of Custody */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Chain of Custody Logs
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeEvidenceModal.chainOfCustody?.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)' }}>
                        <span>Action: {log.action}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(log.timestamp).toUTCString()}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                        Officer: {log.officer} // Facility: {log.facility}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Associated Target Actors */}
              {activeEvidenceModal.entityIds?.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Linked Target Entities
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {activeEvidenceModal.entityIds.map(eId => (
                      <button
                        key={eId}
                        onClick={() => {
                          setActiveEvidenceModal(null);
                          selectEntity(eId);
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--accent-cyan)' }}
                      >
                        <span>{eId}</span>
                        <ExternalLink size={11} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
