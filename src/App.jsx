import React from 'react';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ProjectsProvider } from './context/ProjectsContext';
import { useProjects } from './context/useProjects';
import { analytics } from './db/firebase';
import { logEvent } from 'firebase/analytics';
import { getSetting, saveSetting } from './db/database';
import Hero from './components/landing/Hero';
import PricingPage from './components/landing/Pricing';
import LegalPage from './components/landing/LegalPage';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Onboarding from './components/onboarding/Onboarding';
import Sidebar from './components/layout/Sidebar';
import ProjectDashboard from './components/dashboard/ProjectDashboard';
import BOQWorkspace from './components/workspace/BOQWorkspace';
import MaterialLibrary from './components/workspace/MaterialLibrary';
import FirebaseActionHandler from './components/auth/FirebaseActionHandler';
import Reports from './components/workspace/Reports';
import Settings from './components/dashboard/Settings';
import ProjectWizard from './components/dashboard/ProjectWizard';
import DrawingAnalyzer from './components/workspace/DrawingAnalyzer';
import CalculationMethodology from './components/workspace/CalculationMethodology';
import { getProjectSavePresentation } from './utils/projectSaveState';
import {
  applyResolvedTheme,
  getNextThemePreference,
  getSystemTheme,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveThemePreference,
  THEME_OPTIONS,
  THEME_SETTING_KEY,
  writeStoredThemePreference,
} from './utils/theme';
import { getAccessPlanName } from './utils/subscription';
import {
  MapPin,
  Calendar,
  User as UserIcon,
  Mail,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Moon,
  Cloud,
  RefreshCw,
  SlidersHorizontal,
  SunMedium,
} from 'lucide-react';

// Class-based Error Boundary to catch render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#450a0a', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1>💥 UI Render Failure</h1>
          <p>{this.state.error?.toString()}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', cursor: 'pointer' }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  console.log('App Rendering...');

  const [themePreference, setThemePreference] = React.useState(() => readStoredThemePreference());
  const [systemTheme, setSystemTheme] = React.useState(() => getSystemTheme());
  const resolvedTheme = React.useMemo(
    () => resolveThemePreference(themePreference, systemTheme),
    [themePreference, systemTheme]
  );

  // Track app load
  React.useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'app_open');
      console.log('📈 Analytics: app_open logged');
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setSystemTheme(event.matches ? THEME_OPTIONS.DARK : THEME_OPTIONS.LIGHT);
    };

    setSystemTheme(mediaQuery.matches ? THEME_OPTIONS.DARK : THEME_OPTIONS.LIGHT);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  React.useEffect(() => {
    writeStoredThemePreference(themePreference);
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme, themePreference]);

  // Consume contexts
  const {
    user, view, setView, authError, setAuthError,
    pendingUser, selectedPlan, verificationEmailStatus,
    handleLogin, handleSignUp, handleResendCode,
    handleOnboardingComplete, handleSendMagicLink, handleSelectPlan, logout,
  } = useAuth();
  const accountPlanName = getAccessPlanName(user);

  React.useEffect(() => {
    let cancelled = false;

    const loadThemePreference = async () => {
      const localPreference = readStoredThemePreference();

      if (!user?.uid) {
        if (!cancelled) {
          setThemePreference(localPreference);
        }
        return;
      }

      const savedPreference = await getSetting(THEME_SETTING_KEY);
      if (cancelled) return;

      const nextPreference = savedPreference
        ? normalizeThemePreference(savedPreference)
        : localPreference;

      setThemePreference(nextPreference);
      writeStoredThemePreference(nextPreference);
    };

    loadThemePreference();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleThemeChange = React.useCallback(async (nextPreference) => {
    const normalizedPreference = normalizeThemePreference(nextPreference);
    setThemePreference(normalizedPreference);
    writeStoredThemePreference(normalizedPreference);

    if (user?.uid) {
      await saveSetting(THEME_SETTING_KEY, normalizedPreference);
    }
  }, [user?.uid]);

  const handleThemeToggle = React.useCallback(() => (
    handleThemeChange(getNextThemePreference(themePreference, resolvedTheme))
  ), [handleThemeChange, resolvedTheme, themePreference]);

  const {
    projects, activeProjectId, setActiveProjectId, activeProject,
    activeTab, setActiveTab,
    showSelector, setShowSelector,
    showAnalyzer, setShowAnalyzer,
    isCreating, focusMode, setFocusMode,
    workspaceIntent, clearWorkspaceIntent,
    calculateTotalValue,
    syncStatus, forceSync,
    handleCreateProject, handleQuickCustomPricingTest, handleCompleteWizard, handleAnalysisComplete,
    handleUpdateProject, handleAddSection, handleDeleteSectionOrItem,
    handleDeleteProject,
  } = useProjects();

  const activeProjectSave = React.useMemo(
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

  // ── Intercept Firebase Auth Action URLs (like email verification) ──
  const searchParams = new URLSearchParams(window.location.search);
  const actionMode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const sharedProjectId = searchParams.get('project');
  const requestedTab = searchParams.get('tab') || 'workspace';
  const handledSharedProjectRef = React.useRef(null);
  const clearSharedProjectParams = React.useCallback(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('project');
    nextUrl.searchParams.delete('tab');
    const nextSearch = nextUrl.searchParams.toString();
    const nextHref = `${nextUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${nextUrl.hash}`;
    window.history.replaceState({}, document.title, nextHref);
  }, []);

  React.useEffect(() => {
    if (!user || !sharedProjectId || !projects.length) return;
    if (handledSharedProjectRef.current === sharedProjectId) return;

    const linkedProject = projects.find((project) => project.id === sharedProjectId);
    if (!linkedProject) return;

    setActiveProjectId(linkedProject.id);
    setActiveTab(requestedTab === 'reports' ? 'reports' : 'workspace');
    setFocusMode(true);
    handledSharedProjectRef.current = sharedProjectId;
    clearSharedProjectParams();
  }, [clearSharedProjectParams, projects, requestedTab, setActiveProjectId, setActiveTab, setFocusMode, sharedProjectId, user]);

  if (actionMode && actionCode) {
    return (
      <FirebaseActionHandler
        mode={actionMode}
        actionCode={actionCode}
        onContinue={() => {
          // Clear query params and go to app or login
          window.history.replaceState({}, document.title, window.location.pathname);
          setView(user ? 'app' : 'login');
        }}
      />
    );
  }

  // ── Early returns for auth views ──
  if (view === 'loading') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <div className="loading-spinner"></div>
      <div style={{ marginLeft: '10px' }}>Loading BOQ Pro...</div>
    </div>
  );

  if (view === 'landing') return <Hero onGetStarted={() => setView(user ? 'app' : 'pricing')} onLogin={() => setView(user ? 'app' : 'login')} resolvedTheme={resolvedTheme} onToggleTheme={handleThemeToggle} />;
  if (view === 'pricing') return <PricingPage
    error={authError}
    userEmail={user?.email}
    onSelectPlan={handleSelectPlan}
    onLogin={() => setView(user ? 'app' : 'login')}
    onBack={() => { setAuthError(null); setView(user ? 'app' : 'landing'); }}
    resolvedTheme={resolvedTheme}
    onToggleTheme={handleThemeToggle}
  />;
  if (view === 'terms') return <LegalPage mode="terms" onBack={() => setView(user ? 'app' : 'signup')} />;
  if (view === 'privacy') return <LegalPage mode="privacy" onBack={() => setView(user ? 'app' : 'signup')} />;
  if (view === 'login') return <Login
    error={authError}
    onLogin={handleLogin}
    onSendMagicLink={handleSendMagicLink}
    onSwitchToSignUp={() => { setAuthError(null); setView('signup'); }}
    onForgotPassword={() => setView('forgot-password')}
    onBack={() => setView(user ? 'app' : 'landing')}
    resolvedTheme={resolvedTheme}
    onToggleTheme={handleThemeToggle}
  />;
  if (view === 'signup') return <SignUp error={authError} selectedPlan={selectedPlan} onSignUp={handleSignUp} onSwitchToLogin={(target) => { setAuthError(null); setView(target); }} onViewTerms={() => setView('terms')} onViewPrivacy={() => setView('privacy')} resolvedTheme={resolvedTheme} onToggleTheme={handleThemeToggle} />;
  if (view === 'verification') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ borderRadius: '50%', background: 'rgba(37, 99, 235, 0.16)', padding: '20px', marginBottom: '10px' }}>
        <Mail size={48} className="text-accent" />
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
        {verificationEmailStatus === 'failed' ? 'Verification email not sent yet' : 'Check your inbox'}
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6 }}>
        {verificationEmailStatus === 'failed'
          ? <>Your account was created for <strong style={{ color: 'var(--text-primary)' }}>{pendingUser?.email || user?.email}</strong>, but the verification email did not go out. Use <strong style={{ color: 'var(--text-primary)' }}>Resend Email</strong> to try again.</>
          : <>We've sent a verification link to<br/><strong style={{ color: 'var(--text-primary)' }}>{pendingUser?.email || user?.email}</strong>. Please click the link to activate your account.</>}
      </p>
      {authError && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          maxWidth: '460px',
          padding: '0.875rem 1rem',
          borderRadius: '14px',
          background: 'rgba(248, 113, 113, 0.12)',
          border: '1px solid rgba(248, 113, 113, 0.28)',
          color: '#fecaca'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ textAlign: 'left', lineHeight: 1.5 }}>{authError}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button onClick={handleResendCode} style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Resend Email</button>
        <button onClick={() => setView('login')} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-600)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Back to Login</button>
      </div>
    </div>
  );
  if (view === 'forgot-password') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', flexDirection: 'column', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <h2>🔑 Password Reset</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '400px', textAlign: 'center' }}>Password reset is handled via Firebase. Please use the Firebase Console or contact support to reset your password.</p>
      <button onClick={() => setView('login')} style={{ padding: '0.75rem 2rem', background: 'var(--accent-600)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>Back to Login</button>
    </div>
  );
  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  // ── Main App Content Router ──
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProjectDashboard
          user={user}
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setActiveTab('workspace');
            setFocusMode(true);
          }}
          onDeleteProject={handleDeleteProject}
          onUpgrade={() => { setView('pricing'); }}
        />;
      case 'workspace':
        return activeProject ? (
          <div className="view-fade-in">
            <BOQWorkspace
              key={activeProject.id}
              project={activeProject}
              launchIntent={workspaceIntent}
              onLaunchIntentHandled={clearWorkspaceIntent}
              onUpdate={handleUpdateProject}
              onAddSection={() => handleAddSection(activeProject.id)}
              onDelete={handleDeleteSectionOrItem}
              onExport={() => setActiveTab('reports')}
            />
          </div>
        ) : (
          <div className="enterprise-card p-4">No project selected. Selected ID: {activeProjectId}</div>
        );
      case 'library':
        return <div className="view-fade-in"><MaterialLibrary user={user} activeProject={activeProject} onUpdate={handleUpdateProject} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'reports':
        return <div className="view-fade-in"><Reports user={user} projects={projects} activeProjectId={activeProjectId} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'settings':
        return <div className="view-fade-in"><Settings user={user} onUpgrade={() => setView('pricing')} themePreference={themePreference} resolvedTheme={resolvedTheme} onThemeChange={handleThemeChange} /></div>;
      case 'methodology':
        return <div className="view-fade-in"><CalculationMethodology /></div>;
      default:
        return <div className="enterprise-card p-4">Feature development in progress...</div>;
    }
  };

  const hideWorkspaceChrome = activeTab === 'workspace' && !!activeProject;

  return (
    <div className={`app-container ${focusMode ? 'focus-mode' : ''} ${hideWorkspaceChrome ? 'workspace-shell' : ''}`}>
      {!focusMode && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={logout} onViewPlans={() => setView('pricing')} />}

      {/* Focus Mode Toggle (appears when sidebar is hidden) */}
      {focusMode && (
        <button
          className="focus-mode-exit-btn"
          onClick={() => setFocusMode(false)}
          title="Exit Focus Mode"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <main className={`content-area ${hideWorkspaceChrome ? 'workspace-content-area' : ''}`}>
        {!hideWorkspaceChrome && (
          <>
        {/* Sticky Summary Bar (Decision Support) */}
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
            <span className="status-text">{accountPlanName?.toUpperCase()} PLAN ACTIVE</span>
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
            <button className="btn-secondary" onClick={handleThemeToggle}>
              {resolvedTheme === THEME_OPTIONS.DARK ? <SunMedium size={16} /> : <Moon size={16} />}
              {resolvedTheme === THEME_OPTIONS.DARK ? 'Light Mode' : 'Dark Mode'}
            </button>
            {activeTab === 'workspace' && (
              <button
                className={`btn-focus ${focusMode ? 'active' : ''}`}
                onClick={() => setFocusMode(!focusMode)}
                title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              >
                {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                {focusMode ? 'Exit Focus' : 'Focus Mode'}
              </button>
            )}
            <button className="btn-secondary" onClick={() => setActiveTab('settings')}><SettingsIcon size={16} /> Settings</button>
            <button className="btn-primary" onClick={handleCreateProject} disabled={isCreating}>{isCreating ? 'Creating...' : 'Create New Project'}</button>
          </div>
        </header>
          </>
        )}

        {renderContent()}

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

        .app-container.workspace-shell .content-area.workspace-content-area,
        .app-container.focus-mode.workspace-shell .content-area.workspace-content-area {
          padding: 0 0 2rem;
          margin-left: 0;
        }

        .app-container.focus-mode .sticky-summary-bar {
          margin: 0 -1.5rem 1.5rem;
          padding: 0.75rem 1.5rem;
          top: 0;
        }

        .focus-mode-exit-btn {
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1000;
          background: var(--primary-900);
          border: none;
          color: white;
          padding: 1rem 0.5rem;
          border-radius: 0 8px 8px 0;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 2px 0 10px rgba(0,0,0,0.2);
        }

        .focus-mode-exit-btn:hover {
          padding-left: 1rem;
          background: var(--accent-600);
        }

        .btn-focus {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid var(--accent-400);
          color: var(--accent-600);
        }

        .btn-focus:hover {
          background: var(--accent-600);
          color: white;
        }

        .btn-focus.active {
          background: var(--accent-600);
          color: white;
        }

        .content-area {
          flex: 1;
          padding: 1rem 3rem 3rem;
          background: var(--bg-main);
          overflow-y: auto;
          position: relative;
        }

        .content-area.workspace-content-area {
          padding: 0 0 2rem;
          background: #f1f5f9;
        }

        .sticky-summary-bar {
          position: sticky;
          top: -1rem;
          z-index: 50;
          background: var(--primary-900);
          margin: 0 -3rem 2rem;
          padding: 0.75rem 3rem;
          display: flex;
          align-items: center;
          gap: 2.5rem;
          color: white;
          box-shadow: var(--shadow-md);
        }

        .summary-item {
          display: flex;
          flex-direction: column;
        }

        .summary-item.save-state {
          min-width: 220px;
        }

        .summary-item .label {
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--primary-500);
          letter-spacing: 0.05em;
        }

        .summary-item .val {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .summary-subtle {
          font-size: 0.6875rem;
          margin-top: 0.15rem;
          color: rgba(255,255,255,0.72);
        }

        .summary-subtle.success { color: #86efac; }
        .summary-subtle.info { color: #93c5fd; }
        .summary-subtle.warning { color: #fcd34d; }
        .summary-subtle.muted { color: #cbd5e1; }
        .summary-subtle.danger { color: #fca5a5; }

        .summary-divider {
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.1);
        }

        .summary-item.status {
          margin-left: auto;
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
        }

        .status-text {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        /* ── Sync Indicator ── */
        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sync-synced {
          background: rgba(74, 222, 128, 0.15);
          color: #4ade80;
        }
        .sync-synced:hover { background: rgba(74, 222, 128, 0.25); }

        .sync-syncing {
          background: rgba(96, 165, 250, 0.15);
          color: #60a5fa;
        }

        .sync-pending {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
        }
        .sync-pending:hover { background: rgba(251, 191, 36, 0.25); }

        .sync-offline {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }

        .sync-spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2.5rem;
        }

        .topbar h1 {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 0;
        }

        .subtitle {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }

        .status-badge {
          font-size: 0.75rem;
          background: var(--accent-600);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          font-weight: 500;
        }

        .meta-row {
          display: flex;
          gap: 1.5rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-item {
          font-size: 0.875rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .save-state-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0.3rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .save-state-chip.success {
          background: rgba(22, 163, 74, 0.12);
          color: var(--success-600);
        }

        .save-state-chip.info {
          background: rgba(37, 99, 235, 0.12);
          color: #2563eb;
        }

        .save-state-chip.warning {
          background: rgba(217, 119, 6, 0.12);
          color: var(--warning-600);
        }

        .save-state-chip.muted {
          background: rgba(148, 163, 184, 0.14);
          color: #64748b;
        }

        .save-state-chip.danger {
          background: rgba(220, 38, 38, 0.12);
          color: var(--danger-600);
        }

        .meta-item.save-detail {
          font-weight: 600;
        }

        .topbar-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-secondary {
          background: var(--bg-card);
          border: 1px solid var(--border-medium);
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary);
        }

        .text-success { color: #4ade80; }
        .text-warning { color: var(--warning-600); }
        .text-danger { color: #f87171; }

        /* ── App Mobile Overrides ── */
        @media (max-width: 768px) {
          .topbar {
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .topbar-actions {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }

          .topbar-actions button {
            white-space: nowrap;
            flex: 1;
          }

          .sticky-summary-bar {
            gap: 1rem;
            padding: 0.5rem 1rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .summary-item .label {
            font-size: 0.55rem;
          }

          .summary-item .val {
            font-size: 0.75rem;
          }

          .summary-divider {
             display: none;
          }

          .summary-item.status {
            margin-left: 0;
            width: 100%;
            justify-content: center;
            border-top: 1px solid rgba(255,255,255,0.1);
            padding-top: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ProjectsProvider>
            <App />
          </ProjectsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
