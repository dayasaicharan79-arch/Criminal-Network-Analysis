/**
 * CONSTELLATION — Master Investigation Operating System
 */
import React, { useEffect } from 'react';
import { useInvestigationStore } from './store/investigationStore.js';
import { HeaderBar } from './components/layout/HeaderBar.jsx';
import { SearchPanel } from './components/search/SearchPanel.jsx';
import { EntityDetailPanel } from './components/entity/EntityDetailPanel.jsx';
import { KnowledgeGraphView } from './components/graph/KnowledgeGraphView.jsx';
import { GeospatialView } from './components/geo/GeospatialView.jsx';
import { TimelineView } from './components/timeline/TimelineView.jsx';
import { AnalyticsView } from './components/analytics/AnalyticsView.jsx';
import { EvidenceVaultView } from './components/evidence/EvidenceVaultView.jsx';
import { SherlockChatView } from './components/ai/SherlockChatView.jsx';
import { MoriartyEngineView } from './components/ai/MoriartyEngineView.jsx';
import { GodsEyeCinemaMode } from './components/cinema/GodsEyeCinemaMode.jsx';
import { DataManagementHub } from './components/data/DataManagementHub.jsx';
import { InvestigationReportModal } from './components/report/InvestigationReportModal.jsx';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const {
    activeView,
    cinemaPlaying,
    fetchInitialData,
    loading,
    error,
  } = useInvestigationStore();

  useEffect(() => {
    fetchInitialData();
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
    }}>
      {/* Top Intelligence Header Bar */}
      <HeaderBar />

      {/* Main Workspace Stage */}
      <main style={{
        flex: 1,
        display: 'flex',
        margin: '8px',
        gap: '8px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Left Drawer: Investigative Search & Filter Matrix */}
        <SearchPanel />

        {/* Center Stage: Dynamic Operational Visualization */}
        <section className="glass-panel" style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {error && (
            <div style={{
              margin: '12px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-crimson)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fca5a5',
              fontSize: '13px',
              zIndex: 50,
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ width: '100%', height: '100%', display: activeView === 'graph' ? 'block' : 'none' }}>
            <KnowledgeGraphView />
          </div>
          <div style={{ width: '100%', height: '100%', display: activeView === 'geo' ? 'block' : 'none' }}>
            <GeospatialView />
          </div>
          {activeView === 'timeline' && <TimelineView />}
          {activeView === 'analytics' && <AnalyticsView />}
          {activeView === 'evidence' && <EvidenceVaultView />}
          {activeView === 'sherlock' && <SherlockChatView />}
          {activeView === 'moriarty' && <MoriartyEngineView />}
          {activeView === 'data' && <DataManagementHub />}
        </section>

        {/* Right Drawer: Canonical Entity Intelligence Dossier */}
        <EntityDetailPanel />
      </main>

      {/* God's Eye Cinema Mode Overlay */}
      {cinemaPlaying && <GodsEyeCinemaMode />}

      {/* Investigation Intelligence Report & Print Engine */}
      <InvestigationReportModal />
    </div>
  );
}

export default App;
