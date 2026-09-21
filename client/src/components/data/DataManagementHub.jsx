/**
 * CONSTELLATION — Investigation Data Management Hub
 *
 * Master investigative workspace integrating:
 * - Manual Data Entry (Progressive multi-entity context-sensitive forms)
 * - Relationship Creator (Connecting entities with classification & metadata)
 * - Bulk Manual Ingestion (Batch records with exact rejection accounting)
 * - File Import Studio (CSV, JSON, XLSX, XLS, XML, TXT, DOCX, PDF)
 * - Synthetic Intelligence Generator (Scenarios A-F with scale controls)
 * - Ingestion Provenance History (Backend audit logs & batch inspector)
 */
import React, { useState } from 'react';
import { ManualEntryForm } from './ManualEntryForm.jsx';
import { RelationshipCreator } from './RelationshipCreator.jsx';
import { BulkEntryForm } from './BulkEntryForm.jsx';
import { FileImportStudio } from './FileImportStudio.jsx';
import { SyntheticGeneratorView } from './SyntheticGeneratorView.jsx';
import { ImportHistoryView } from './ImportHistoryView.jsx';
import {
  Database,
  PlusCircle,
  Link2,
  ListPlus,
  UploadCloud,
  Sparkles,
  History,
  Shield,
  Layers,
} from 'lucide-react';

const TABS = [
  { id: 'manual', label: 'Manual Entry', icon: PlusCircle, desc: 'Add individual entities, locations, or evidence' },
  { id: 'rel', label: 'Link Entities', icon: Link2, desc: 'Create verified relationships between entities' },
  { id: 'bulk', label: 'Bulk Entry', icon: ListPlus, desc: 'Multi-record structured entry with validation' },
  { id: 'import', label: 'File Import Studio', icon: UploadCloud, desc: 'Import CSV, JSON, Excel, XML, Word, PDF' },
  { id: 'synthetic', label: 'Synthetic Generator', icon: Sparkles, desc: 'Generate multi-scenario intelligence graphs' },
  { id: 'history', label: 'Import History', icon: History, desc: 'Audit trail of all ingestion batches & provenance' },
];

export function DataManagementHub() {
  const [activeTab, setActiveTab] = useState('manual');

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at top, #0b1120 0%, #07090e 100%)',
    }}>
      {/* Workspace Hub Navigation Header */}
      <div style={{
        padding: '16px 20px 12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Database size={18} color="#07090e" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                INVESTIGATION DATA MANAGEMENT
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Canonical unified ingestion gateway — manual entry, file import, synthetic scenarios & provenance audit
              </div>
            </div>
          </div>

          <div className="badge badge-cyan" style={{ fontSize: '10px', padding: '4px 8px' }}>
            <Shield size={11} /> UNIFIED INGESTION PIPELINE
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`btn ${isActive ? 'btn-active' : 'btn-ghost'}`}
                style={{
                  padding: '7px 12px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  background: isActive ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.02)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={13} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Stage */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {activeTab === 'manual' && <ManualEntryForm />}
          {activeTab === 'rel' && <RelationshipCreator />}
          {activeTab === 'bulk' && <BulkEntryForm />}
          {activeTab === 'import' && <FileImportStudio />}
          {activeTab === 'synthetic' && <SyntheticGeneratorView />}
          {activeTab === 'history' && <ImportHistoryView />}
        </div>
      </div>
    </div>
  );
}

export default DataManagementHub;
