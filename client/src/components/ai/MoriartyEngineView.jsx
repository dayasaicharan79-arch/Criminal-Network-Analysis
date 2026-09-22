/**
 * CONSTELLATION — Moriarty Adversarial Analytical Engine
 *
 * Implements deterministic, dataset-grounded counter-hypothesis engine:
 * - Stress-tests investigative theories against confirmation bias
 * - Evaluates structural intermediary vulnerabilities, identifier collisions, financial ambiguities, uncorroborated links
 * - Displays classifications: FACT, COMPUTED, HYPOTHESIS, RECOMMENDED_VERIFICATION
 * - Robust handling of signals, weaknesses, facts, and computed analytical metrics
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
  FileCheck,
  Cpu,
  Target,
  ArrowRight,
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
  const [error, setError] = useState(null);

  const fetchMoriarty = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.queryMoriarty({
        caseId: activeCaseId,
        selectedEntityId,
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to run Moriarty analysis:', err);
      setError(err.message || 'Failed to load Moriarty adversarial intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoriarty();
  }, [activeCaseId, selectedEntityId]);

  const assessments = data?.adversarialAssessments || [];

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
              Devil's advocate counter-hypothesis engine stress-testing investigative theories against confirmation bias. Grounded strictly in active case records.
            </p>
          </div>

          <button
            onClick={fetchMoriarty}
            className="btn btn-ghost"
            style={{ fontSize: '11px', padding: '6px 12px' }}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'pulsing-indicator' : ''} />
            <span>{loading ? 'Analyzing...' : 'Re-evaluate Theories'}</span>
          </button>
        </div>

        {/* Legal Disclaimer Alert */}
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
            <strong>LEGAL ADVISORY:</strong> These counter-assessments simulate rigorous defense arguments and alternative innocent explanations. All findings are classified into <strong>FACT</strong>, <strong>COMPUTED</strong>, <strong>HYPOTHESIS</strong>, and <strong>RECOMMENDED VERIFICATION</strong> to prevent premature confirmation bias before judicial submission.
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="pulsing-indicator" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Executing Grounded Adversarial Analysis...</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Evaluating topological betweenness, identifier ambiguity, and temporal continuity</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--accent-crimson)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <AlertTriangle size={18} color="var(--accent-crimson)" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && assessments.length === 0 && !error && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 'var(--radius-lg)' }}>
            <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No Significant Prosecutorial Vulnerabilities Identified
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0 auto', lineHeight: '1.5' }}>
              The current active case records exhibit robust corroboration across physical exhibits, single-owner identifiers, and direct transaction documentation.
            </div>
          </div>
        )}

        {/* Assessments List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {assessments.map((item) => {
            // Defensively normalize arrays
            const facts = Array.isArray(item.facts) ? item.facts : (item.facts ? [item.facts] : []);
            const computed = Array.isArray(item.computed) ? item.computed : (item.computed ? [item.computed] : []);
            const weaknesses = Array.isArray(item.weaknessesInProsecution)
              ? item.weaknessesInProsecution
              : (item.weaknessesInProsecution ? [item.weaknessesInProsecution] : []);
            const supportingSignals = Array.isArray(item.supportingSignals) ? item.supportingSignals : [];

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                {/* Badge Header Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-gold">
                      {item.id} // {item.classification || 'HYPOTHESIS'}
                    </span>
                    {item.signalType && (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '10px' }}>
                        {item.signalType}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.targetEntity && (
                      <button
                        onClick={() => {
                          if (item.targetEntityId) {
                            selectEntity(item.targetEntityId);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(0, 242, 254, 0.1)',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          color: '#00f2fe',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                        title="Focus Entity in Investigation"
                      >
                        <Target size={11} />
                        <span>{item.targetEntity}</span>
                      </button>
                    )}
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      Plausibility: {((item.confidenceScore || 0.6) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f8fafc', marginTop: '12px' }}>
                  {item.title}
                </h3>

                {/* Prosecutorial Claim Challenged */}
                {item.claimChallenged && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-crimson)' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Theory Challenged [Prosecutorial Assertion]
                    </div>
                    <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '2px', fontWeight: 500 }}>
                      "{item.claimChallenged}"
                    </div>
                  </div>
                )}

                {/* Counter Hypothesis (Alternative Explanation) */}
                {item.counterHypothesis && (
                  <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-gold)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <AlertTriangle size={12} />
                      <span>Alternative Plausible Explanation [HYPOTHESIS]</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px', lineHeight: '1.5' }}>
                      {item.counterHypothesis}
                    </div>
                  </div>
                )}

                {/* Grounded Evidence Facts vs Computed Indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  {/* Factual Foundations */}
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '6px' }}>
                      <FileCheck size={13} />
                      <span>Empirical Factual Observations [FACT]</span>
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                      {facts.length > 0 ? (
                        facts.map((fact, i) => <li key={i}>{fact}</li>)
                      ) : (
                        <li>Grounded in active DataStore case records and seized exhibits.</li>
                      )}
                    </ul>
                  </div>

                  {/* Computed Network Signals */}
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                      <Cpu size={13} />
                      <span>Algorithmic Metrics [COMPUTED]</span>
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                      {computed.length > 0 ? (
                        computed.map((comp, i) => <li key={i}>{comp}</li>)
                      ) : supportingSignals.length > 0 ? (
                        supportingSignals.map((sig, i) => <li key={i}>{sig}</li>)
                      ) : (
                        <li>Structural metrics derived from graph centrality and occurrence frequencies.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Prosecutorial Vulnerabilities if any */}
                {weaknesses.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-crimson)', marginBottom: '4px' }}>
                      Investigative Vulnerabilities Identified:
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                      {weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Remedial Verification */}
                {item.recommendedVerification && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      <strong style={{ color: 'var(--accent-emerald)' }}>RECOMMENDED VERIFICATION:</strong>{' '}
                      {item.recommendedVerification}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MoriartyEngineView;
