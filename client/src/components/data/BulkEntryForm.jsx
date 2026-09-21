/**
 * CONSTELLATION — Bulk Manual Ingestion Component
 *
 * Supports adding multiple records in one operation with:
 * - Real-time dry-run validation preview (/api/ingest/validate)
 * - Exact accepted/rejected counts
 * - Granular rejection reporting explaining why each record failed
 * - Deduplication & entity resolution preview
 * - Ingestion commit (/api/ingest)
 */
import React, { useState } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  ListPlus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UploadCloud,
  FileCode,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

const SAMPLE_BULK_JSON = `[
  {
    "type": "person",
    "label": "Vikram Rathore",
    "subType": "Financial Operator",
    "attributes": {
      "phoneNumber": "+91 98110 44219",
      "alias": "Rathore Ji"
    }
  },
  {
    "type": "suspect",
    "label": "Anil 'Courier' Mehra",
    "subType": "Cash Carrier",
    "attributes": {
      "phoneNumber": "+91 99201 55182",
      "plate": "DL-01-AB-9921"
    }
  },
  {
    "type": "phone",
    "label": "+91 91234 56789",
    "attributes": {
      "imei": "864209040112340"
    }
  },
  {
    "type": "location",
    "name": "Chandni Chowk Hawala Hub",
    "city": "New Delhi",
    "latitude": 28.6506,
    "longitude": 77.2303
  }
]`;

export function BulkEntryForm() {
  const { activeCaseId, refreshInvestigationData } = useInvestigationStore();

  const [rawText, setRawText] = useState(SAMPLE_BULK_JSON);
  const [format, setFormat] = useState('json'); // 'json' | 'csv_text'
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleReset = () => {
    setRawText('');
    setPreviewResult(null);
    setStatusMessage(null);
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_BULK_JSON);
    setPreviewResult(null);
    setStatusMessage(null);
  };

  // Convert raw text to unified ingestion payload
  const parseBulkPayload = () => {
    if (!rawText.trim()) {
      throw new Error('Please enter records in JSON array format');
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`JSON Syntax Error: ${e.message}`);
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];

    const entities = [];
    const relationships = [];
    const locations = [];
    const events = [];

    items.forEach((item, idx) => {
      const type = (item.type || 'person').toLowerCase();

      if (type === 'location') {
        locations.push({
          id: item.id || `LOC-BULK-${Date.now()}-${idx + 1}`,
          name: item.name || item.label || `${item.city || 'Site'}, India`,
          city: item.city || 'Investigative Hub',
          state: item.state || '',
          latitude: parseFloat(item.latitude),
          longitude: parseFloat(item.longitude),
          address: item.address || '',
          caseId: activeCaseId,
          source: 'BULK_MANUAL_ENTRY',
        });
      } else if (type === 'event' || type === 'timeline_event') {
        events.push({
          id: item.id || `EVT-BULK-${Date.now()}-${idx + 1}`,
          title: item.title || item.label || 'Investigation Event',
          eventType: item.eventType || 'CASE_EVENT',
          timestamp: item.timestamp || new Date().toISOString(),
          caseId: activeCaseId,
          severity: item.severity || 'MEDIUM',
        });
      } else if (type === 'relationship') {
        relationships.push({
          id: item.id || `REL-BULK-${Date.now()}-${idx + 1}`,
          source: item.source,
          target: item.target,
          type: item.relType || item.type || 'ASSOCIATED_WITH',
          label: item.label,
          caseIds: [activeCaseId],
          confidence: parseFloat(item.confidence) || 1.0,
        });
      } else {
        // Standard entity
        entities.push({
          id: item.id || `ENT-BULK-${Date.now()}-${idx + 1}`,
          type,
          label: item.label || item.name || '',
          subType: item.subType || item.role,
          caseIds: [activeCaseId],
          confidence: parseFloat(item.confidence) || 1.0,
          attributes: item.attributes || {},
          source: 'BULK_MANUAL_ENTRY',
        });
      }
    });

    return {
      source: 'manual',
      caseId: activeCaseId,
      entities,
      relationships,
      locations,
      events,
      metadata: {
        entryMethod: 'bulk_manual',
        enteredAt: new Date().toISOString(),
      },
    };
  };

  // Run dry-run validation preview
  const handleValidatePreview = async () => {
    setValidating(true);
    setStatusMessage(null);
    setPreviewResult(null);

    try {
      const payload = parseBulkPayload();
      const res = await api.validateIngest(payload);
      setPreviewResult(res.data);

      if (res.data.summary.rejected > 0) {
        setStatusMessage({
          type: 'warning',
          text: `Validation Preview: ${res.data.summary.accepted} accepted, ${res.data.summary.rejected} rejected with exact reasons below.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Validation Complete: All ${res.data.summary.accepted} records passed validation! Ready to commit.`,
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  // Commit accepted records to database
  const handleCommit = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = parseBulkPayload();
      const res = await api.ingest(payload);

      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully ingested batch ${res.data.batchId}! Committed ${res.data.summary.accepted} records to ${activeCaseId}.`,
        });

        // Refresh all views
        await refreshInvestigationData();

        setTimeout(() => {
          handleReset();
        }, 2000);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Bulk ingestion failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Bulk Manual Records Entry
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Paste or structure multiple entities, locations, and relationships simultaneously
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleLoadSample} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
            <FileCode size={12} /> Load Sample
          </button>
          <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: statusMessage.type === 'error'
            ? 'rgba(239, 68, 68, 0.2)'
            : statusMessage.type === 'warning'
              ? 'rgba(245, 158, 11, 0.2)'
              : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${
            statusMessage.type === 'error'
              ? 'var(--accent-crimson)'
              : statusMessage.type === 'warning'
                ? 'var(--accent-gold)'
                : 'var(--accent-emerald)'
          }`,
          color: statusMessage.type === 'error' ? '#fca5a5' : statusMessage.type === 'warning' ? '#fde047' : '#86efac',
        }}>
          {statusMessage.type === 'error' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Editor Area */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          JSON Array of Investigation Records
        </label>
        <textarea
          rows={10}
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder='[ { "type": "person", "label": "John Doe", "attributes": { "phoneNumber": "+91..." } } ]'
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px',
            color: 'var(--accent-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: '1.5',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={handleValidatePreview}
          disabled={validating || !rawText.trim()}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          {validating ? 'Validating Batch...' : 'Dry-Run Validation Preview'}
        </button>
        <button
          type="button"
          onClick={handleCommit}
          disabled={submitting || !previewResult || previewResult.summary.accepted === 0}
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: '12px' }}
        >
          {submitting ? 'Committing Ingestion...' : `Commit ${previewResult ? previewResult.summary.accepted : ''} Records`}
        </button>
      </div>

      {/* Rejection Accounting & Resolution Preview Table */}
      {previewResult && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'rgba(0,0,0,0.3)',
          padding: '12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-medium)',
        }}>
          {/* Summary Metric Counters */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px',
          }}>
            <div>Submitted: <strong>{previewResult.summary.submitted}</strong></div>
            <div>Accepted: <strong style={{ color: 'var(--accent-emerald)' }}>{previewResult.summary.accepted}</strong></div>
            <div>Rejected: <strong style={{ color: previewResult.summary.rejected > 0 ? 'var(--accent-crimson)' : 'var(--text-muted)' }}>{previewResult.summary.rejected}</strong></div>
            <div>Entities Merged: <strong style={{ color: 'var(--accent-cyan)' }}>{previewResult.summary.entitiesMerged}</strong></div>
          </div>

          {/* Granular Rejections Breakdown */}
          {previewResult.rejections.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-crimson)', marginBottom: '6px' }}>
                Rejection Reasons ({previewResult.rejections.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {previewResult.rejections.map((rej, idx) => (
                  <div key={idx} style={{
                    fontSize: '11px',
                    padding: '6px 10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    color: '#fca5a5',
                  }}>
                    <strong>#{rej.index + 1} [{rej.type.toUpperCase()} - {rej.identifier || '(no id)'}]:</strong>{' '}
                    {rej.reasons.join('; ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Log */}
          {previewResult.resolutionLog.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                Entity Resolution & Deduplication:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {previewResult.resolutionLog.map((res, idx) => (
                  <div key={idx} style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    background: 'rgba(0, 242, 254, 0.05)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                  }}>
                    <span className={`badge ${res.action === 'MERGED' ? 'badge-gold' : 'badge-emerald'}`} style={{ fontSize: '9px', marginRight: '6px' }}>
                      {res.action}
                    </span>
                    {res.label} ({res.incomingId}) {res.action === 'MERGED' ? `-> Merged into ${res.resolvedId} [${res.matchType}]` : '-> New node created'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BulkEntryForm;
