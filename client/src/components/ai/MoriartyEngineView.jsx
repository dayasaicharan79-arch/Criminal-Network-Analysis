/**
 * CONSTELLATION — Moriarty Adversarial Analytical Engine
 */
import React, { useState, useEffect } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  Zap,
  ShieldAlert,
  AlertTriangle,
  Scale,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export function MoriartyEngineView() {
  const {
    activeCaseId,
    selectedEntityId,
    selectEntity,
    setActiveView,
  } = useInvestigationStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMoriarty = async () => {
    setLoading(true);
    try {
      const res = await api.queryMoriarty({
        caseId: activeCaseId,
        selectedEntityId,
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to run Moriarty analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoriarty();
  }, [activeCaseId, selectedEntityId]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      background: 'radial-gradient(ellipse at top, #1a0f2e 0%, #07090e 100%)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={22} color="var(--accent-gold)" />
              <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                Moriarty Adversarial Engine
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Devil's advocate counter-hypothesis engine stress-testing investigative theories against confirmation bias.
            </p>
          </div>

          <button
            onClick={fetchMoriarty}
            className="btn btn-ghost"
            style={{ fontSize: '11px', padding: '6px 12px' }}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'pulsing-indicator' : ''} />
            <span>Re-evaluate Theories</span>
          </button>
        </div>

        {/* Disclaimer Alert */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <Scale size={18} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '12px', color: '#fef3c7', lineHeight: '1.4' }}>
            <strong>LEGAL ADVISORY:</strong> These counter-assessments simulate rigorous defense arguments and alternative innocent explanations. They are designed to harden the investigation before chargesheets are submitted to the judiciary.
          </div>
        </div>

        {/* Assessments List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {data?.adversarialAssessments?.map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="badge badge-gold">
                  {item.id} // COUNTER-HYPOTHESIS
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Plausibility Score: {(item.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginTop: '10px' }}>
                {item.title}
              </h3>

              {/* Prosecutorial Claim Challenged */}
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-crimson)' }}>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', textTransform: 'uppercase' }}>
                  Investigative Theory Challenged
                </div>
                <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '2px', fontWeight: 500 }}>
                  "{item.claimChallenged}"
                </div>
              </div>

              {/* Counter Hypothesis */}
              <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-gold)' }}>
                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                  Alternative Plausible Explanation
                </div>
                <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px', lineHeight: '1.5' }}>
                  {item.counterHypothesis}
                </div>
              </div>

              {/* Vulnerabilities & Supporting Signals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '6px' }}>
                    Supporting Observations
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {item.supportingSignals?.map((sig, i) => (
                      <li key={i}>{sig}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-crimson)', marginBottom: '6px' }}>
                    Prosecutorial Vulnerabilities
                  </div>
                  <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {item.weaknessesInProsecution?.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Verification */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                  <strong>Remedial Verification:</strong> {item.recommendedVerification}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
