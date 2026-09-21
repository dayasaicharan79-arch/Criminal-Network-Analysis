/**
 * CONSTELLATION — File Import Studio Component
 *
 * Implements the complete investigative file ingestion workflow:
 * FILE PICKER -> FILE TYPE DETECTION -> PARSING -> PREVIEW -> FIELD MAPPING -> VALIDATION -> CONFIRMATION -> INGESTION
 *
 * Supported & verified formats: CSV, JSON, XLSX, XLS, XML, TXT, DOCX, PDF
 */
import React, { useState, useRef } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  parseInvestigationFile,
  suggestFieldMappings,
  buildIngestionPayloadFromMapping,
  TARGET_FIELDS,
} from '../../utils/fileParsers.js';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Eye,
  Sliders,
  ShieldCheck,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export function FileImportStudio() {
  const { activeCaseId, refreshInvestigationData } = useInvestigationStore();
  const fileInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState('pick'); // 'pick' | 'preview_map' | 'validate' | 'done'
  const [fileMeta, setFileMeta] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [parsing, setParsing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleReset = () => {
    setCurrentStep('pick');
    setFileMeta(null);
    setParsedData(null);
    setFieldMapping({});
    setValidationResult(null);
    setStatusMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setStatusMessage(null);

    try {
      const parsed = await parseInvestigationFile(file);

      // Set file metadata
      setFileMeta({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        format: parsed.format,
        rowCount: parsed.rows.length,
        colCount: parsed.headers.length,
      });

      setParsedData(parsed);

      // Auto-suggest field mappings
      const initialMapping = suggestFieldMappings(parsed.headers);
      setFieldMapping(initialMapping);

      setCurrentStep('preview_map');
      setStatusMessage({
        type: 'success',
        text: `Successfully parsed ${file.name} [${parsed.format}]: Extracted ${parsed.rows.length} records across ${parsed.headers.length} fields.`,
      });
    } catch (err) {
      console.error('File parsing error:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to parse file: ${err.message}`,
      });
    } finally {
      setParsing(false);
    }
  };

  const handleLoadDemoFixture = async (fixturePath, fileName, mimeType) => {
    setParsing(true);
    setStatusMessage(null);
    try {
      const res = await fetch(fixturePath);
      if (!res.ok) throw new Error(`Could not load demo fixture: ${res.statusText}`);
      const text = await res.text();
      const blob = new Blob([text], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      const parsed = await parseInvestigationFile(file);

      setFileMeta({
        name: file.name,
        size: (blob.size / 1024).toFixed(1) + ' KB',
        format: parsed.format,
        rowCount: parsed.rows.length,
        colCount: parsed.headers.length,
      });

      setParsedData(parsed);

      const initialMapping = suggestFieldMappings(parsed.headers);
      setFieldMapping(initialMapping);

      setCurrentStep('preview_map');
      setStatusMessage({
        type: 'success',
        text: `Loaded Demo Fixture "${file.name}" [${parsed.format}]: Extracted ${parsed.rows.length} records.`,
      });
    } catch (err) {
      console.error('Demo fixture loading error:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to load demo fixture: ${err.message}`,
      });
    } finally {
      setParsing(false);
    }
  };

  const handleMappingChange = (header, target) => {
    setFieldMapping(prev => ({
      ...prev,
      [header]: target,
    }));
  };

  // Run dry-run validation preview
  const handleValidatePreview = async () => {
    setValidating(true);
    setStatusMessage(null);

    try {
      const payload = buildIngestionPayloadFromMapping({
        rows: parsedData.rows,
        mapping: fieldMapping,
        caseId: activeCaseId,
        filename: fileMeta.name,
      });

      if (
        payload.entities.length === 0 &&
        payload.locations.length === 0 &&
        payload.events.length === 0 &&
        payload.relationships.length === 0
      ) {
        throw new Error('No mapped records generated. Please map at least one column to Entity Label, Location, Event, or Relationship.');
      }

      const res = await api.validateIngest(payload);
      setValidationResult(res.data);
      setCurrentStep('validate');

      if (res.data.summary.rejected > 0) {
        setStatusMessage({
          type: 'warning',
          text: `Validation Preview: ${res.data.summary.accepted} accepted, ${res.data.summary.rejected} rejected records. Review before committing.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `All ${res.data.summary.accepted} records successfully verified by ingestion normalization & entity resolution engine.`,
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Validation preview failed' });
    } finally {
      setValidating(false);
    }
  };

  // Commit ingestion
  const handleConfirmImport = async () => {
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = buildIngestionPayloadFromMapping({
        rows: parsedData.rows,
        mapping: fieldMapping,
        caseId: activeCaseId,
        filename: fileMeta.name,
      });

      const res = await api.ingest(payload);

      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${res.data.summary.accepted} records from ${fileMeta.name} (Batch: ${res.data.batchId})! Workspace synchronized.`,
        });
        setCurrentStep('done');

        // Refresh all investigation views
        await refreshInvestigationData();
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'File import ingestion failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Studio Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Intelligence File Ingestion Studio
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Parse, map, validate, and normalize forensic evidence files (CSV, JSON, XLSX, XLS, TXT, XML, DOCX, PDF)
          </div>
        </div>
        {fileMeta && (
          <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }}>
            <RotateCcw size={12} /> New Import
          </button>
        )}
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

      {/* STEP 1: File Picker */}
      {currentStep === 'pick' && (
        <>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          border: '2px dashed var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(0,0,0,0.25)',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls,.xml,.txt,.docx,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(0, 242, 254, 0.1)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UploadCloud size={24} color="var(--accent-cyan)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {parsing ? 'Parsing File Intelligence...' : 'Choose File or Drag & Drop'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Supported: CSV, JSON, Excel (.xlsx, .xls), XML, Plain Text (.txt), Word (.docx), PDF (.pdf)
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', marginTop: '6px' }}
            disabled={parsing}
          >
            {parsing ? 'Extracting...' : 'Browse Local Files'}
          </button>
        </div>

        {/* Quick-Load Demo Import Fixtures */}
        <div style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: 'rgba(0, 242, 254, 0.04)',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              <Sparkles size={14} />
              <span>QUICK-LOAD DEMO IMPORT FIXTURES</span>
            </div>
            <span className="badge badge-gold" style={{ fontSize: '9px' }}>
              SYNTHETIC // DEMO DATA ONLY
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleLoadDemoFixture('/samples/sample_cdr_log.csv', 'sample_cdr_log.csv', 'text/csv')}
              disabled={parsing}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                textAlign: 'left',
                gap: '4px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <FileSpreadsheet size={14} color="var(--accent-cyan)" /> Demo CDR Log (.CSV)
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                6 Indian CDR records, GPS tower coordinates & IMEIs
              </div>
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleLoadDemoFixture('/samples/sample_suspect_dossiers.json', 'sample_suspect_dossiers.json', 'application/json')}
              disabled={parsing}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                textAlign: 'left',
                gap: '4px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <FileCode size={14} color="var(--accent-gold)" /> Suspect Dossiers (.JSON)
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                4 Structured syndicate suspects with aliases & plates
              </div>
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => handleLoadDemoFixture('/samples/sample_surveillance_log.txt', 'sample_surveillance_log.txt', 'text/plain')}
              disabled={parsing}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                textAlign: 'left',
                gap: '4px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <FileText size={14} color="var(--accent-emerald)" /> Field Intel Log (.TXT)
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Unstructured surveillance text with timestamps & safehouses
              </div>
            </button>
          </div>
        </div>
        </>
      )}

      {/* STEP 2: Pre-Import Preview & Field Mapping Matrix */}
      {currentStep === 'preview_map' && parsedData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* File Metadata Overview Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}>
            <div>FILE: <strong style={{ color: 'var(--text-primary)' }}>{fileMeta.name}</strong></div>
            <div>FORMAT: <strong style={{ color: 'var(--accent-cyan)' }}>{fileMeta.format}</strong></div>
            <div>SIZE: <strong style={{ color: 'var(--text-muted)' }}>{fileMeta.size}</strong></div>
            <div>RECORDS: <strong style={{ color: 'var(--accent-gold)' }}>{fileMeta.rowCount}</strong></div>
            <div>COLUMNS: <strong style={{ color: 'var(--accent-emerald)' }}>{fileMeta.colCount}</strong></div>
          </div>

          {/* Field Mapping Wizard */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
              Field Mapping (Detected Column -&gt; Canonical Investigation Attribute)
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}>
              {parsedData.headers.map(header => (
                <div key={header} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{
                    width: '140px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={header}>
                    {header}
                  </span>
                  <ArrowRight size={12} color="var(--text-muted)" />
                  <select
                    value={fieldMapping[header] || 'IGNORE'}
                    onChange={e => handleMappingChange(header, e.target.value)}
                    style={{
                      flex: 1,
                      background: '#07090e',
                      border: fieldMapping[header] !== 'IGNORE' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      color: fieldMapping[header] !== 'IGNORE' ? '#fff' : 'var(--text-muted)',
                      fontSize: '11px',
                    }}
                  >
                    {TARGET_FIELDS.map(tf => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Data Rows Preview Table */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Extracted Record Preview (First 5 Rows)
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {parsedData.headers.slice(0, 7).map(h => (
                      <th key={h} style={{ padding: '6px 10px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.rows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {parsedData.headers.slice(0, 7).map(h => (
                        <td key={h} style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                          {String(row[h] !== undefined ? row[h] : '').substring(0, 40)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={handleReset} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '12px' }}>
              Cancel
            </button>
            <button
              onClick={handleValidatePreview}
              disabled={validating}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '12px' }}
            >
              {validating ? 'Verifying Schema...' : 'Validate & Preview Ingestion'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Validation Preview & Confirmation */}
      {currentStep === 'validate' && validationResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            padding: '12px',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '8px' }}>
              Ingestion Pipeline Validation Report
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div>Submitted: <strong>{validationResult.summary.submitted}</strong></div>
              <div>Accepted: <strong style={{ color: 'var(--accent-emerald)' }}>{validationResult.summary.accepted}</strong></div>
              <div>Rejected: <strong style={{ color: validationResult.summary.rejected > 0 ? 'var(--accent-crimson)' : 'var(--text-muted)' }}>{validationResult.summary.rejected}</strong></div>
              <div>Entities Merged: <strong style={{ color: 'var(--accent-cyan)' }}>{validationResult.summary.entitiesMerged}</strong></div>
            </div>

            {/* Rejections if any */}
            {validationResult.rejections.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-crimson)', marginBottom: '4px' }}>
                  Rejected Records ({validationResult.rejections.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                  {validationResult.rejections.map((rej, idx) => (
                    <div key={idx} style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '4px',
                      color: '#fca5a5',
                    }}>
                      Row #{rej.index + 1} [{rej.identifier}]: {rej.reasons.join('; ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setCurrentStep('preview_map')}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Adjust Mappings
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={submitting || validationResult.summary.accepted === 0}
              className="btn btn-primary"
              style={{
                padding: '8px 24px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                color: '#07090e',
                fontWeight: 700,
              }}
            >
              {submitting ? 'Ingesting...' : `Confirm & Commit Import (${validationResult.summary.accepted} Records)`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {currentStep === 'done' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-lg)',
          gap: '12px',
        }}>
          <CheckCircle2 size={36} color="var(--accent-emerald)" />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#86efac' }}>
            Import Successfully Completed
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
            All accepted records have been normalized, resolved against existing entities, and committed to the CONSTELLATION Knowledge Graph.
          </div>
          <button
            onClick={handleReset}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '12px', marginTop: '6px' }}
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

export default FileImportStudio;
