/**
 * CONSTELLATION — Import History & Ingestion Provenance Viewer
 *
 * Connects directly to backend audit logs via GET /api/ingest/history and GET /api/ingest/history/:id
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import {
  History,
  Clock,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  ChevronRight,
  Database,
  FileText,
  User,
  Zap,
} from 'lucide-react';

export function ImportHistoryView() {
  const [historyList, setHistoryList] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getIngestHistory({ limit: 50 });
      setHistoryList(res.data || []);
      if (res.data?.length > 0 && !selectedBatch) {
        // Auto-select most recent batch
        fetchBatchDetails(res.data[0].batchId);
      }
    } catch (err) {
      setError(err.message || 'Failed to load ingestion history');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (batchId) => {
    setDetailLoading(true);
    try {
      const res = await api.getIngestHistoryById(batchId);
      setSelectedBatch(res.data);
    } catch (err) {
      console.error('Failed to load batch details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', minHeight: '420px' }}>
      {/* Left: Batches Table */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Ingestion Provenance Batches ({historyList.length})
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Refresh History"
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ margin: '10px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', fontSize: '11px' }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {historyList.length === 0 && !loading && (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No ingestion batches recorded yet.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {historyList.map(batch => {
              const isSelected = selectedBatch?.batchId === batch.batchId;
              const source = batch.source || 'manual';

              return (
                <div
                  key={batch.batchId}
                  onClick={() => fetchBatchDetails(batch.batchId)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: isSelected ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent-cyan)' : '3px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {batch.batchId}
                    </span>
                    <span className={`badge ${source === 'synthetic' ? 'badge-gold' : source === 'file' ? 'badge-cyan' : 'badge-emerald'}`} style={{ fontSize: '9px' }}>
                      {source.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>
                      {batch.metadata?.filename || batch.metadata?.scenario || (batch.caseId || 'Investigation')}
                    </span>
                    <span>
                      {new Date(batch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--accent-emerald)' }}>+{batch.summary?.accepted || 0} accepted</span>
                    {batch.summary?.rejected > 0 && (
                      <span style={{ color: 'var(--accent-crimson)' }}>-{batch.summary?.rejected} rejected</span>
                    )}
                    {batch.summary?.entitiesMerged > 0 && (
                      <span style={{ color: 'var(--accent-gold)' }}>~{batch.summary?.entitiesMerged} merged</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Selected Batch Inspector */}
      <div style={{
        flex: 1.2,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-medium)',
        overflow: 'hidden',
        padding: '14px',
      }}>
        {selectedBatch ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {selectedBatch.batchId}
                </span>
                <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                  COMMITTED TO KNOWLEDGE GRAPH
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Ingested: {new Date(selectedBatch.timestamp).toLocaleString()} | Case: {selectedBatch.caseId || 'Global'}
              </div>
            </div>

            {/* Ingestion Metric Counters */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              padding: '10px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
            }}>
              <div>Submitted: <strong>{selectedBatch.summary?.submitted}</strong></div>
              <div>Accepted: <strong style={{ color: 'var(--accent-emerald)' }}>{selectedBatch.summary?.accepted}</strong></div>
              <div>Rejected: <strong style={{ color: selectedBatch.summary?.rejected > 0 ? 'var(--accent-crimson)' : 'var(--text-muted)' }}>{selectedBatch.summary?.rejected}</strong></div>
              <div>Entities Created: <strong>{selectedBatch.summary?.entitiesCreated}</strong></div>
              <div>Entities Merged: <strong style={{ color: 'var(--accent-gold)' }}>{selectedBatch.summary?.entitiesMerged}</strong></div>
              <div>Relationships: <strong>{selectedBatch.summary?.relationshipsCreated}</strong></div>
            </div>

            {/* Rejection Audit Log */}
            {selectedBatch.rejections?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-crimson)', marginBottom: '6px' }}>
                  Rejections Audit Trail ({selectedBatch.rejections.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                  {selectedBatch.rejections.map((rej, idx) => (
                    <div key={idx} style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '4px',
                      color: '#fca5a5',
                    }}>
                      Record #{rej.index + 1} [{rej.type} - {rej.identifier}]: {rej.reasons?.join('; ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Log */}
            {selectedBatch.resolutionLog?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                  Entity Resolution Log ({selectedBatch.resolutionLog.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                  {selectedBatch.resolutionLog.map((res, idx) => (
                    <div key={idx} style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span>
                        <span className={`badge ${res.action === 'MERGED' ? 'badge-gold' : 'badge-emerald'}`} style={{ fontSize: '8px', marginRight: '6px' }}>
                          {res.action}
                        </span>
                        {res.label} ({res.incomingId})
                      </span>
                      {res.matchType && (
                        <span style={{ color: 'var(--accent-cyan)' }}>[{res.matchType}]</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px' }}>
            Select an ingestion batch on the left to inspect its provenance audit trail.
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportHistoryView;
