import React from 'react';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ProjectsProvider } from './context/ProjectsContext';
import { useProjects } from './context/useProjects';
import { analytics } from './db/firebase';
import { logEvent } from 'firebase/analytics';
import LandingLayout from './components/landing/LandingLayout';
import HomePage from './components/landing/HomePage';
import FeaturesPage from './components/landing/FeaturesPage';
import AboutPage from './components/landing/AboutPage';
import ContactPage from './components/landing/ContactPage';
import PricingPage from './components/landing/Pricing';
import LegalPage from './components/landing/LegalPage';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import PasswordReset from './components/auth/PasswordReset';
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
import { WorkspaceProvider } from './context/WorkspaceContext';

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
  Cloud,
  RefreshCw,
  SlidersHorizontal,
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


  // Track app load
  React.useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'app_open');

    }
  }, []);

  // Consume contexts
  const {
    user, view, setView, authError, setAuthError,
    pendingUser, selectedPlan, verificationEmailStatus,
    handleLogin, handleSignUp, handleResendCode,
    handleOnboardingComplete, handleSendMagicLink, handleSelectPlan, logout,
  } = useAuth();
  const accountPlanName = getAccessPlanName(user);

  const {
    projects, activeProjectId, setActiveProjectId, activeProject,
    activeTab, setActiveTab,
    showSelector, setShowSelector,
    showAnalyzer, setShowAnalyzer,
    isCreating, focusMode, setFocusMode,
    workspaceIntent, clearWorkspaceIntent,
    calculateTotalValue,
    syncStatus, forceSync,
    openWorkspace,
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
  const paystackReturn = searchParams.get('paystack');
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

    if (requestedTab === 'reports') {
      setActiveProjectId(linkedProject.id);
      setActiveTab('reports');
      setFocusMode(true);
    } else {
      openWorkspace(linkedProject.id);
    }
    handledSharedProjectRef.current = sharedProjectId;
    clearSharedProjectParams();
  }, [clearSharedProjectParams, openWorkspace, projects, requestedTab, setActiveProjectId, setActiveTab, setFocusMode, sharedProjectId, user]);

  React.useEffect(() => {
    if (paystackReturn !== 'return' || !user) return;
    setView('pricing');
  }, [paystackReturn, setView, user]);

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
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="loading-spinner"></div>
      <div style={{ marginLeft: '10px', fontWeight: 700 }}>Quantra — Loading workspace...</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Professional Bill of Quantities Management</div>
    </div>

  );

  // ── Multi-page Landing Router ──
  const landingViews = ['home', 'features', 'about', 'contact', 'landing'];
  if (landingViews.includes(view)) {
    const currentLandingView = view === 'landing' ? 'home' : view;
    const pageContent = (() => {
      switch (currentLandingView) {
        case 'home':
          return <HomePage onGetStarted={() => setView(user ? 'app' : 'pricing')} onLogin={() => setView(user ? 'app' : 'login')} />;
        case 'features':
          return <FeaturesPage onGetStarted={() => setView(user ? 'app' : 'pricing')} />;
        case 'about':
          return <AboutPage onGetStarted={() => setView(user ? 'app' : 'pricing')} />;
        case 'contact':
          return <ContactPage onGetStarted={() => setView(user ? 'app' : 'pricing')} />;
        default:
          return <HomePage onGetStarted={() => setView(user ? 'app' : 'pricing')} onLogin={() => setView(user ? 'app' : 'login')} />;
      }
    })();

    return (
      <LandingLayout
        currentView={currentLandingView}
        onNavigate={(target) => setView(target)}
        onGetStarted={() => setView(user ? 'app' : 'pricing')}
        onLogin={() => setView(user ? 'app' : 'login')}
      >
        {pageContent}
      </LandingLayout>
    );
  }

  if (view === 'pricing') return (
    <LandingLayout
      currentView="pricing"
      onNavigate={(target) => setView(target)}
      onGetStarted={() => setView(user ? 'app' : 'pricing')}
      onLogin={() => setView(user ? 'app' : 'login')}
    >
      <PricingPage
        error={authError}
        userEmail={user?.email}
        userId={user?.id}
        onSelectPlan={handleSelectPlan}
        onLogin={() => setView(user ? 'app' : 'login')}
        onBack={() => { setAuthError(null); setView(user ? 'app' : 'landing'); }}
      />
    </LandingLayout>
  );
  if (view === 'terms') return <LegalPage mode="terms" onBack={() => setView(user ? 'app' : 'signup')} />;
  if (view === 'privacy') return <LegalPage mode="privacy" onBack={() => setView(user ? 'app' : 'signup')} />;
  if (view === 'login') return <Login
    error={authError}
    onLogin={handleLogin}
    onSendMagicLink={handleSendMagicLink}
    onSwitchToSignUp={() => { setAuthError(null); setView('signup'); }}
    onForgotPassword={() => setView('forgot-password')}
    onBack={() => setView(user ? 'app' : 'landing')}
  />;
  if (view === 'signup') return <SignUp error={authError} selectedPlan={selectedPlan} onSignUp={handleSignUp} onSwitchToLogin={(target) => { setAuthError(null); setView(target); }} onViewTerms={() => setView('terms')} onViewPrivacy={() => setView('privacy')} />;
  if (view === 'verification') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ borderRadius: '50%', background: 'rgba(16, 185, 129, 0.16)', padding: '20px', marginBottom: '10px' }}>
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
  if (view === 'forgot-password') return <PasswordReset onBack={() => setView('login')} />;
  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  // ── Main App Content Router ──
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':

        return <ProjectDashboard
          user={user}
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={(id) => openWorkspace(id)}
          onDeleteProject={handleDeleteProject}
          onUpgrade={() => { setView('pricing'); }}
        />;
      case 'workspace':
        return activeProject ? (
          <div className="view-fade-in">
            <WorkspaceProvider
              project={activeProject}
              launchIntent={workspaceIntent}
              onLaunchIntentHandled={clearWorkspaceIntent}
              onUpdate={handleUpdateProject}
              onAddSection={() => handleAddSection(activeProject.id)}
              onDelete={handleDeleteSectionOrItem}
              onExport={() => setActiveTab('reports')}
            >
              <BOQWorkspace />
            </WorkspaceProvider>
          </div>
        ) : (
          <div className="enterprise-card p-4">No project selected. Selected ID: {activeProjectId}</div>
        );
      case 'library':
        return <div className="view-fade-in"><MaterialLibrary user={user} activeProject={activeProject} onUpdate={handleUpdateProject} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'reports':
        return <div className="view-fade-in"><Reports user={user} projects={projects} activeProjectId={activeProjectId} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'settings':
        return <div className="view-fade-in"><Settings user={user} onUpgrade={() => setView('pricing')} /></div>;
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
          <ChevronLeft size={20} />
        </button>
      )}

      <main className={`content-area staggered-fade-in ${hideWorkspaceChrome ? 'workspace-content-area' : ''}`}>
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

        <header className="topbar glass-card">
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
                <p className="subtitle">Ready to price your next Nigerian construction project?</p>

              </>
            )}
          </div>
          <div className="topbar-actions">
            <button className="btn-secondary" onClick={handleQuickCustomPricingTest}>
              <SlidersHorizontal size={16} /> Quick Test Pricing
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
            <button className="btn-primary emerald-button" onClick={handleCreateProject} disabled={isCreating}>{isCreating ? 'Creating...' : 'Create New Project'}</button>
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
