import React from 'react';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ProjectsProvider } from './context/ProjectsContext';
import { useProjects } from './context/useProjects';
import { analytics } from './db/firebase';
import { logEvent } from 'firebase/analytics';
import { primeLiveFxRates } from './utils/fxRates';
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

function OTPVerificationView({ email, authError, setAuthError, verificationEmailStatus, handleResendCode, handleVerifyCode, handleLogout }) {
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const inputRefs = React.useRef([]);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleChange = (index, val) => {
    if (val && !/^\d+$/.test(val)) return;

    const newCode = [...code];
    newCode[index] = val.slice(-1);
    setCode(newCode);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setCode(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;

    setIsVerifying(true);
    setAuthError(null);
    try {
      await handleVerifyCode(fullCode);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTriggerResend = async () => {
    if (cooldown > 0) return;
    setCooldown(60);
    await handleResendCode();
  };

  const isCodeComplete = code.every(char => char !== '');

  return (
    <div className="otp-container">
      <div className="otp-card glass-card">
        <div className="otp-icon-wrapper">
          <Mail size={40} className="otp-icon" />
        </div>

        <h2>Verify your email</h2>
        <p className="otp-subtitle">
          We sent a 6-digit verification code to<br/>
          <strong>{email}</strong>
        </p>

        {authError && (
          <div className="otp-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="otp-inputs">
            {code.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                pattern="[0-9]*"
                inputMode="numeric"
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                ref={el => inputRefs.current[index] = el}
                disabled={isVerifying}
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            className="otp-submit-btn"
            disabled={!isCodeComplete || isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="otp-footer">
          <button
            onClick={handleTriggerResend}
            disabled={cooldown > 0 || isVerifying}
            className="otp-resend-btn"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
          </button>
          <span className="divider">•</span>
          <button onClick={handleLogout} className="otp-logout-btn">
            Log out
          </button>
        </div>
      </div>

      <style>{`
        .otp-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090d16;
          background-image: radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.05) 0%, transparent 40%),
                            radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 40%);
          padding: 2rem;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .otp-card {
          width: 100%;
          max-width: 460px;
          padding: 3rem 2.5rem;
          border-radius: 20px;
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          text-align: center;
        }
        .otp-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          margin-bottom: 1.5rem;
        }
        .otp-card h2 {
          color: #ffffff;
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
        }
        .otp-subtitle {
          color: #94a3b8;
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .otp-subtitle strong {
          color: #f8fafc;
        }
        .otp-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-size: 0.875rem;
          text-align: left;
          margin-bottom: 1.75rem;
          line-height: 1.4;
        }
        .otp-inputs {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }
        .otp-inputs input {
          width: 54px;
          height: 60px;
          text-align: center;
          font-size: 1.6rem;
          font-weight: 700;
          color: #ffffff;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: all 0.2s ease;
          font-family: monospace;
        }
        .otp-inputs input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
          outline: none;
          background: rgba(15, 23, 42, 0.8);
        }
        .otp-inputs input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .otp-submit-btn {
          width: 100%;
          padding: 1rem;
          border-radius: 12px;
          background: #f59e0b;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1.5rem;
        }
        .otp-submit-btn:hover:not(:disabled) {
          background: #d97706;
          transform: translateY(-1px);
        }
        .otp-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .otp-submit-btn:disabled {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
        }
        .otp-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 0.9rem;
        }
        .otp-resend-btn, .otp-logout-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 0;
        }
        .otp-resend-btn:hover:not(:disabled), .otp-logout-btn:hover {
          color: #f59e0b;
        }
        .otp-resend-btn:disabled {
          color: #475569;
          cursor: not-allowed;
        }
        .otp-footer .divider {
          color: #475569;
        }
      `}</style>
    </div>
  );
}

function App() {
  // Dark mode is force-disabled: most of the UI (~93% of hardcoded colors
  // across components) was never wired to the design-token system's dark
  // overrides, so `data-theme="dark"` currently renders a half-broken mix of
  // themed and un-themed surfaces. Force 'light' regardless of a stale saved
  // preference or the visitor's OS dark-mode setting, and hide the toggle UI
  // (Sidebar.jsx, Settings.jsx) until components are migrated onto the
  // token system. See git history for the removed toggle implementation.
  const theme = 'light';

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch live exchange rates once at startup and keep them refreshing in
  // the background (see fxRates.js) so project currency conversion tracks
  // the real-world rate automatically, without a page reload.
  React.useEffect(() => {
    primeLiveFxRates();
  }, []);

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
    handleLogin, handleSSOLogin, handleSignUp, handleResendCode, handleVerifyCode,
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
    if (user && user.is_verified === false && view !== 'verification') {
      setView('verification');
    }
  }, [user, view, setView]);

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
    onSSOLogin={handleSSOLogin}
    onSendMagicLink={handleSendMagicLink}
    onSwitchToSignUp={() => { setAuthError(null); setView('signup'); }}
    onForgotPassword={() => setView('forgot-password')}
    onBack={() => setView(user ? 'app' : 'landing')}
  />;
  if (view === 'signup') return <SignUp error={authError} selectedPlan={selectedPlan} onSignUp={handleSignUp} onSSOLogin={handleSSOLogin} onSwitchToLogin={(target) => { setAuthError(null); setView(target); }} onViewTerms={() => setView('terms')} onViewPrivacy={() => setView('privacy')} />;
  if (view === 'verification') return (
    <OTPVerificationView
      email={pendingUser?.email || user?.email || 'your email'}
      authError={authError}
      setAuthError={setAuthError}
      verificationEmailStatus={verificationEmailStatus}
      handleResendCode={handleResendCode}
      handleVerifyCode={handleVerifyCode}
      handleLogout={logout}
    />
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
