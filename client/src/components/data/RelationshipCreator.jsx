/**
 * CONSTELLATION — Relationship Creator Component
 *
 * Progressive Workflow:
 * SELECT SOURCE ENTITY -> SELECT RELATIONSHIP TYPE -> SELECT TARGET ENTITY -> ADD METADATA -> VALIDATE -> REVIEW -> CREATE RELATIONSHIP
 */
import React, { useState, useMemo } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import { RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_LABELS } from '@constellation/shared/constants.js';
import {
  Link2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Shield,
  Layers,
} from 'lucide-react';

export function RelationshipCreator() {
  const {
    activeCaseId,
    graphData,
    refreshInvestigationData,
    selectRelationship,
  } = useInvestigationStore();

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [relType, setRelType] = useState(RELATIONSHIP_TYPES.COMMUNICATED_WITH);
  const [customLabel, setCustomLabel] = useState('');
  const [confidence, setConfidence] = useState(0.9);
  const [classification, setClassification] = useState('FACT'); // FACT | INFERENCE | POTENTIAL_RELATIONSHIP
  const [provenance, setProvenance] = useState('DIRECT_OBSERVATION'); // DIRECT_OBSERVATION | EXTRACTED_CDR | FORENSIC_REPORT | INFERRED
  const [timestamp, setTimestamp] = useState(new Date().toISOString().substring(0, 16));
  const [notes, setNotes] = useState('');

  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');

  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Available entity options from active graph nodes
  const availableEntities = useMemo(() => {
    return graphData?.nodes || [];
  }, [graphData]);

  const filteredSourceEntities = useMemo(() => {
    if (!sourceSearch) return availableEntities.slice(0, 20);
    const q = sourceSearch.toLowerCase();
    return availableEntities.filter(e =>
      e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [availableEntities, sourceSearch]);

  const filteredTargetEntities = useMemo(() => {
    if (!targetSearch) return availableEntities.slice(0, 20);
    const q = targetSearch.toLowerCase();
    return availableEntities.filter(e =>
      e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [availableEntities, targetSearch]);

  const sourceEntity = availableEntities.find(e => e.id === sourceId);
  const targetEntity = availableEntities.find(e => e.id === targetId);

  const handleReset = () => {
    setSourceId('');
    setTargetId('');
    setRelType(RELATIONSHIP_TYPES.COMMUNICATED_WITH);
    setCustomLabel('');
    setConfidence(0.9);
    setClassification('FACT');
    setProvenance('DIRECT_OBSERVATION');
    setNotes('');
    setValidationResult(null);
    setStatusMessage(null);
  };

  const preparePayload = () => {
    return {
      source: 'manual',
      caseId: activeCaseId,
      relationships: [{
        id: `REL-MANUAL-${Date.now()}`,
        source: sourceId,
        target: targetId,
        type: relType,
        label: customLabel.trim() || RELATIONSHIP_TYPE_LABELS[relType] || relType,
        confidence: parseFloat(confidence) || 1.0,
        caseIds: [activeCaseId],
        provenance,
        classification,
        timestamp: new Date(timestamp).toISOString(),
        metadata: {
          notes: notes.trim() || undefined,
          isManualEntry: true,
        },
      }],
    };
  };

  const handleValidate = async () => {
    if (!sourceId || !targetId) {
      setStatusMessage({ type: 'error', text: 'Both source and target entities must be selected.' });
      return;
    }
    if (sourceId === targetId) {
      setStatusMessage({ type: 'error', text: 'Source and target entities cannot be identical.' });
      return;
    }

    setValidating(true);
    setStatusMessage(null);

    try {
      const payload = preparePayload();
      const res = await api.validateIngest(payload);
      setValidationResult(res.data);

      if (res.data.summary.rejected > 0) {
        setStatusMessage({
          type: 'error',
          text: `Validation failed: ${res.data.rejections[0]?.reasons?.join('; ')}`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Relationship verified against investigation knowledge graph. Ready to commit.',
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  const handleCommit = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = preparePayload();
      const res = await api.ingest(payload);

      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: `Created relationship between ${sourceEntity?.label || sourceId} and ${targetEntity?.label || targetId}!`,
        });

        // Targeted workspace refresh
        await refreshInvestigationData();

        if (payload.relationships?.[0]) {
          selectRelationship(payload.relationships[0]);
        }

        setTimeout(() => {
          handleReset();
        }, 1800);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create relationship' });
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
            Investigative Relationship Creator
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Link entities with provenance, telecommunications intelligence, or evidentiary classification
          </div>
        </div>
        <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${statusMessage.type === 'error' ? 'var(--accent-crimson)' : 'var(--accent-emerald)'}`,
          color: statusMessage.type === 'error' ? '#fca5a5' : '#86efac',
        }}>
          {statusMessage.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Visual Link Builder Overview */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '14px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-medium)',
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source Entity</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: sourceEntity ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
            {sourceEntity ? sourceEntity.label : '(Select Source)'}
          </div>
          {sourceEntity && (
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {sourceEntity.type.toUpperCase()} // {sourceEntity.id}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            {RELATIONSHIP_TYPE_LABELS[relType] || relType}
          </span>
          <ArrowRight size={16} color="var(--accent-cyan)" />
        </div>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Entity</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: targetEntity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
            {targetEntity ? targetEntity.label : '(Select Target)'}
          </div>
          {targetEntity && (
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {targetEntity.type.toUpperCase()} // {targetEntity.id}
            </div>
          )}
        </div>
      </div>

      {/* Entity Selectors & Relationship Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Source Entity Picker */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            1. Select Source Entity *
          </label>
          <div style={{ position: 'relative', marginBottom: '6px' }}>
            <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search source entity..."
              value={sourceSearch}
              onChange={e => setSourceSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px 6px 26px',
                color: '#fff',
                fontSize: '11px',
              }}
            />
          </div>
          <select
            size={5}
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
            style={{
              width: '100%',
              background: '#07090e',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '11px',
              padding: '4px',
              outline: 'none',
            }}
          >
            {filteredSourceEntities.map(e => (
              <option key={e.id} value={e.id} style={{ padding: '4px' }}>
                {e.label} [{e.type.toUpperCase()}]
              </option>
            ))}
          </select>
        </div>

        {/* Target Entity Picker */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            3. Select Target Entity *
          </label>
          <div style={{ position: 'relative', marginBottom: '6px' }}>
            <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search target entity..."
              value={targetSearch}
              onChange={e => setTargetSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px 6px 26px',
                color: '#fff',
                fontSize: '11px',
              }}
            />
          </div>
          <select
            size={5}
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            style={{
              width: '100%',
              background: '#07090e',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '11px',
              padding: '4px',
              outline: 'none',
            }}
          >
            {filteredTargetEntities.map(e => (
              <option key={e.id} value={e.id} style={{ padding: '4px' }}>
                {e.label} [{e.type.toUpperCase()}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Relationship Type & Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            2. Relationship Type *
          </label>
          <select
            value={relType}
            onChange={e => setRelType(e.target.value)}
            style={{
              width: '100%',
              background: '#07090e',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 10px',
              color: 'var(--accent-cyan)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {Object.entries(RELATIONSHIP_TYPES).map(([k, val]) => (
              <option key={k} value={val}>
                {RELATIONSHIP_TYPE_LABELS[val] || val}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Classification
          </label>
          <select
            value={classification}
            onChange={e => setClassification(e.target.value)}
            style={{
              width: '100%',
              background: '#07090e',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 10px',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <option value="FACT">FACT (Confirmed Evidence)</option>
            <option value="INFERENCE">INFERENCE (Analytical Deduction)</option>
            <option value="POTENTIAL_RELATIONSHIP">POTENTIAL RELATIONSHIP</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Provenance
          </label>
          <select
            value={provenance}
            onChange={e => setProvenance(e.target.value)}
            style={{
              width: '100%',
              background: '#07090e',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '7px 10px',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <option value="DIRECT_OBSERVATION">DIRECT OBSERVATION</option>
            <option value="EXTRACTED_CDR">EXTRACTED CDR LOG</option>
            <option value="FORENSIC_REPORT">FORENSIC REPORT</option>
            <option value="CONFIDENTIAL_INFORMANT">CONFIDENTIAL INFORMANT</option>
            <option value="INFERRED">INFERRED</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Timestamp
          </label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '12px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Confidence: {confidence}
          </label>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.01"
            value={confidence}
            onChange={e => setConfidence(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-cyan)', marginTop: '8px' }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Investigator Notes / Context
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Intercepted outgoing call duration 142s via Tower Sector 42..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            color: '#fff',
            fontSize: '12px',
            resize: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={handleValidate}
          disabled={validating || !sourceId || !targetId}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          {validating ? 'Validating...' : 'Validate Relationship'}
        </button>
        <button
          type="button"
          onClick={handleCommit}
          disabled={submitting || !sourceId || !targetId}
          className="btn btn-primary"
          style={{ padding: '8px 20px', fontSize: '12px' }}
        >
          {submitting ? 'Creating...' : 'Create & Update Graph'}
        </button>
      </div>
    </div>
  );
}

export default RelationshipCreator;
