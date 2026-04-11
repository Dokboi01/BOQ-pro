import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useProjects } from '../../context/useProjects';
import Sidebar from './Sidebar';
import ProjectWizard from '../dashboard/ProjectWizard';
import DrawingAnalyzer from '../workspace/DrawingAnalyzer';
import { getProjectSavePresentation } from '../../utils/projectSaveState';
import { motion as Motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Settings as SettingsIcon,
  ChevronRight,
  Maximize2,
  Minimize2,
  Cloud,
  RefreshCw,
  SlidersHorizontal,
  Home
} from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, setView, logout } = useAuth();
  
  const {
    projects, activeProject, 
    showSelector, setShowSelector,
    showAnalyzer, setShowAnalyzer,
    isCreating, focusMode, setFocusMode,
    calculateTotalValue,
    syncStatus, forceSync,
    handleCreateProject, handleQuickCustomPricingTest, handleCompleteWizard, handleAnalysisComplete,
  } = useProjects();

  const activeProjectSave = useMemo(
    () => getProjectSavePresentation(activeProject, { globalSyncState: syncStatus.state }),
    [activeProject, syncStatus.state]
  );

  const syncLabel = syncStatus.state === 'pending' && syncStatus.pendingCount > 0
    ? `${syncStatus.pendingCount} Pending`
    : syncStatus.state === 'synced'
      ? 'Synced'
      : syncStatus.state === 'syncing'
        ? 'Syncing'
        : syncStatus.state === 'pending'
          ? 'Pending'
          : 'Offline';

  // Derive title/subtitles for breadcrumbs based on route
  const isSettings = location.pathname.includes('/settings');
  const isWorkspace = location.pathname.includes('/workspace');
  
  let pageTitle = 'Dashboard';
  if (isSettings) pageTitle = 'Settings';
  if (activeProject) {
    if (location.pathname.includes('workspace')) pageTitle = 'Workspace';
    if (location.pathname.includes('library')) pageTitle = 'Price Library';
    if (location.pathname.includes('reports')) pageTitle = 'Reports';
  }

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3
  };

  return (
    <div className={`app-container ${focusMode ? 'focus-mode' : ''}`}>
      {!focusMode && <Sidebar user={user} onLogout={logout} onViewPlans={() => setView('pricing')} />}

      {/* Focus Mode Toggle */}
      {focusMode && (
        <button
          className="focus-mode-exit-btn"
          onClick={() => setFocusMode(false)}
          title="Exit Focus Mode"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <main className="content-area">
        {/* Sticky Summary Bar */}
        <div className="sticky-summary-bar">
          <div className="summary-item">
            <span className="label">ESTIMATED COST</span>
            <span className="val">₦{calculateTotalValue.toLocaleString()}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="label">{activeProject ? 'SECTIONS' : 'PROJECTS'}</span>
            <span className={`val ${projects.length > 0 ? 'text-success' : ''}`}>
              {activeProject ? (activeProject.sections?.length || 0) : projects.length}
            </span>
          </div>
          {activeProject && (
            <>
              <div className="summary-divider"></div>
              <div className="summary-item save-state">
                <span className="label">PROJECT SAVE</span>
                <span className="val">{activeProjectSave.badgeLabel}</span>
                <span className={`summary-subtle ${activeProjectSave.tone}`}>{activeProjectSave.detail}</span>
              </div>
            </>
          )}
          <div className="summary-item status">
            <ShieldCheck size={14} className="text-success" />
            <span className="status-text">{user?.plan?.toUpperCase()} PLAN ACTIVE</span>
          </div>
          <div className="summary-divider"></div>
          <button
            className={`sync-indicator sync-${syncStatus.state}`}
            onClick={forceSync}
            title={`Sync: ${syncStatus.state}. Click to force sync.`}
          >
            {syncStatus.state === 'syncing' ? (
              <RefreshCw size={13} className="sync-spinning" />
            ) : (
              <Cloud size={13} />
            )}
            <span className="sync-label">{syncLabel}</span>
          </button>
        </div>

        <header className="topbar">
          <div className="project-info">
            <div className="breadcrumb">
               <Link to="/dashboard" className="crumb-link"><Home size={14}/> BOQ Pro</Link>
               {activeProject && (
                 <>
                   <ChevronRight size={14} className="crumb-sep" />
                   <span className="crumb-static">{activeProject.name || 'Untitled Project'}</span>
                 </>
               )}
               <ChevronRight size={14} className="crumb-sep" />
               <span className="crumb-current">{pageTitle}</span>
            </div>

            {activeProject ? (
              <>
                <h1>
                  {activeProject?.name || 'Untitled Project'}
                  <span className="status-badge">
                    {activeProject?.status || 'Draft'}
                  </span>
                </h1>
                <div className="meta-row">
                  <span className="meta-item"><MapPin size={14} /> {activeProject?.region || 'Location not set'}</span>
                  <span className="meta-item"><UserIcon size={14} /> {user?.full_name || 'Practitioner'}</span>
                  <span className="meta-item"><Calendar size={14} /> {(() => { const d = activeProject?.date; if (!d) return 'No date'; let dt; if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) { const [y, m, day] = String(d).split('-').map(Number); dt = new Date(y, m - 1, day); } else { dt = new Date(d); } if (Number.isNaN(dt.getTime())) return d; const q = Math.ceil((dt.getMonth() + 1) / 3); return `Q${q} ${dt.getFullYear()}`; })()}</span>
                  <span className={`save-state-chip ${activeProjectSave.tone}`}>{activeProjectSave.badgeLabel}</span>
                  <span className="meta-item save-detail"><Cloud size={14} /> {activeProjectSave.timestampLabel}</span>
                </div>
              </>
            ) : (
              <>
                <h1>Welcome, {user?.full_name || 'Practitioner'}</h1>
                <p className="subtitle">Ready to start your next professional BOQ?</p>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <button className="btn-secondary" onClick={handleQuickCustomPricingTest}>
              <SlidersHorizontal size={16} /> Quick Test Pricing
            </button>
            {isWorkspace && (
              <button
                className={`btn-focus ${focusMode ? 'active' : ''}`}
                onClick={() => setFocusMode(!focusMode)}
                title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              >
                {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {focusMode ? 'Exit Focus' : 'Focus Mode'}
              </button>
            )}
            <button className="btn-secondary" onClick={() => navigate('/settings')}><SettingsIcon size={16} /> Settings</button>
            <button className="btn-primary" onClick={handleCreateProject} disabled={isCreating}>{isCreating ? 'Creating...' : 'Create New Project'}</button>
          </div>
        </header>

        {/* Render child routes with transitions */}
         <Motion.div
           key={location.pathname}
           initial="initial"
           animate="in"
           exit="out"
           variants={pageVariants}
           transition={pageTransition}
           className="view-fade-in"
         >
           <Outlet />
         </Motion.div>

        {showSelector && <ProjectWizard
          onSelect={handleCompleteWizard}
          onClose={() => setShowSelector(false)}
        />}

        {showAnalyzer && <DrawingAnalyzer
          onComplete={handleAnalysisComplete}
          onClose={() => setShowAnalyzer(false)}
        />}
      </main>

      <style jsx="true">{`
        .app-container {
          display: flex;
          min-height: 100vh;
          transition: all 0.3s ease;
        }
        .app-container.focus-mode .content-area {
          margin-left: 0;
          padding: 0 1.5rem 1.5rem;
        }
        .app-container.focus-mode .sticky-summary-bar {
          margin: 0 -1.5rem 1.5rem;
          padding: 0.75rem 1.5rem;
          top: 0;
        }
        .focus-mode-exit-btn {
          position: fixed; left: 0; top: 50%; transform: translateY(-50%); z-index: 1000;
          background: var(--primary-900); border: none; color: white; padding: 1rem 0.5rem;
          border-radius: 0 8px 8px 0; cursor: pointer; transition: all 0.3s;
          box-shadow: 2px 0 10px rgba(0,0,0,0.2);
        }
        .focus-mode-exit-btn:hover {
          padding-left: 1rem; background: var(--accent-600);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--primary-400);
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .crumb-link {
          color: var(--primary-500);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: color 0.2s;
        }
        .crumb-link:hover { color: white; }
        .crumb-sep { color: var(--border-medium); }
        .crumb-current { color: var(--accent-400); font-weight: 700; }
        .crumb-static { color: var(--primary-300); }

        .btn-focus {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;
          border-radius: var(--radius-sm); font-weight: 600; font-size: 0.875rem;
          cursor: pointer; transition: all 0.2s; background: rgba(37, 99, 235, 0.1);
          border: 1px solid var(--accent-400); color: var(--accent-600);
        }
        .btn-focus:hover { background: var(--accent-600); color: white; }
        .btn-focus.active { background: var(--accent-600); color: white; }

        .content-area {
          flex: 1; padding: 1rem 3rem 3rem; background: var(--bg-main);
          overflow-y: auto; position: relative;
        }

        .sticky-summary-bar {
          position: sticky; top: -1rem; z-index: 50; background: var(--primary-900);
          margin: 0 -3rem 2rem; padding: 0.75rem 3rem; display: flex; align-items: center;
          gap: 2.5rem; color: white; box-shadow: var(--shadow-md);
        }
        .summary-item { display: flex; flex-direction: column; }
        .summary-item.save-state { min-width: 220px; }
        .summary-item .label { font-size: 0.625rem; font-weight: 800; color: var(--primary-500); letter-spacing: 0.05em; }
        .summary-item .val { font-size: 0.875rem; font-weight: 700; }
        .summary-subtle { font-size: 0.6875rem; margin-top: 0.15rem; color: rgba(255,255,255,0.72); }
        .summary-subtle.success { color: #86efac; }
        .summary-subtle.info { color: #93c5fd; }
        .summary-subtle.warning { color: #fcd34d; }
        .summary-subtle.muted { color: #cbd5e1; }
        .summary-subtle.danger { color: #fca5a5; }

        .summary-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.1); }
        .summary-item.status { margin-left: auto; flex-direction: row; align-items: center; gap: 0.5rem; }
        .status-text { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.02em; }

        /* Sync Indicator */
        .sync-indicator {
          display: flex; align-items: center; gap: 0.375rem; padding: 0.3rem 0.75rem;
          border-radius: 100px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.02em;
          border: none; cursor: pointer; transition: all 0.2s;
        }
        .sync-synced { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
        .sync-synced:hover { background: rgba(74, 222, 128, 0.25); }
        .sync-syncing { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
        .sync-pending { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
        .sync-pending:hover { background: rgba(251, 191, 36, 0.25); }
        .sync-offline { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
        .sync-spinning { animation: spin 1s linear infinite; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
        .topbar h1 { font-size: 1.5rem; display: flex; align-items: center; gap: 1rem; margin: 0; }
        .subtitle { font-size: 0.8125rem; color: var(--primary-500); margin-top: 0.25rem; }
        .status-badge { font-size: 0.75rem; background: var(--accent-600); color: white; padding: 0.25rem 0.75rem; border-radius: 100px; font-weight: 500; }
        .meta-row { display: flex; gap: 1.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .meta-item { font-size: 0.875rem; color: var(--primary-500); display: flex; align-items: center; gap: 0.4rem; }
        .save-state-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 0.3rem 0.7rem; font-size: 0.72rem; font-weight: 800; }
        .save-state-chip.success { background: rgba(22, 163, 74, 0.12); color: var(--success-600); }
        .save-state-chip.info { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
        .save-state-chip.warning { background: rgba(217, 119, 6, 0.12); color: var(--warning-600); }
        .save-state-chip.muted { background: rgba(148, 163, 184, 0.14); color: #64748b; }
        .save-state-chip.danger { background: rgba(220, 38, 38, 0.12); color: var(--danger-600); }
        .meta-item.save-detail { font-weight: 600; }
        .topbar-actions { display: flex; gap: 0.75rem; }
        .btn-secondary { background: white; border: 1px solid var(--border-medium); padding: 0.625rem 1.25rem; border-radius: var(--radius-sm); font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .text-success { color: #4ade80; }

        @media (max-width: 768px) {
          .topbar { flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
          .topbar-actions { width: 100%; overflow-x: auto; padding-bottom: 0.5rem; }
          .topbar-actions button { white-space: nowrap; flex: 1; }
          .sticky-summary-bar { gap: 1rem; padding: 0.5rem 1rem; flex-wrap: wrap; justify-content: center; }
          .summary-item .label { font-size: 0.55rem; }
          .summary-item .val { font-size: 0.75rem; }
          .summary-divider { display: none; }
          .summary-item.status { margin-left: 0; width: 100%; justify-content: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.25rem; }
        }
      `}</style>
    </div>
  );
}
