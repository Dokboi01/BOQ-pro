import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { ProjectsProvider } from './context/ProjectsContext';
import { useProjects } from './context/useProjects';
import { analytics } from './db/firebase';
import { logEvent } from 'firebase/analytics';

// Layout & Routing
import AppLayout from './components/layout/AppLayout';

// Auth & Landing Views
import Hero from './components/landing/Hero';
import PricingPage from './components/landing/Pricing';
import LegalPage from './components/landing/LegalPage';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Onboarding from './components/onboarding/Onboarding';
import FirebaseActionHandler from './components/auth/FirebaseActionHandler';

// Main App Views
import ProjectDashboard from './components/dashboard/ProjectDashboard';
import BOQWorkspace from './components/workspace/BOQWorkspace';
import MaterialLibrary from './components/workspace/MaterialLibrary';
import Reports from './components/workspace/Reports';
import Settings from './components/dashboard/Settings';
import CalculationMethodology from './components/workspace/CalculationMethodology';

import { Mail, AlertCircle } from 'lucide-react';

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

function MainApp() {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'app_open');
      console.log('📈 Analytics: app_open logged');
    }
  }, []);

  const {
    user, view, setView, authError, setAuthError,
    pendingUser, selectedPlan, verificationEmailStatus,
    handleLogin, handleSignUp, handleResendCode,
    handleOnboardingComplete, handleSendMagicLink, handleSelectPlan,
  } = useAuth();

  const {
    projects, activeProject, workspaceIntent, clearWorkspaceIntent,
    activeProjectId, setActiveTab, setFocusMode, openWorkspace,
    handleUpdateProject, handleAddSection, handleDeleteSectionOrItem,
    handleCreateProject, handleDeleteProject
  } = useProjects();

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

    const requestKey = `${sharedProjectId}:${requestedTab}`;
    if (handledSharedProjectRef.current === requestKey) return;

    const linkedProject = projects.find((project) => project.id === sharedProjectId);
    if (!linkedProject) return;

    const nextTab = requestedTab === 'reports' || requestedTab === 'library'
      ? requestedTab
      : 'workspace';

    handledSharedProjectRef.current = requestKey;
    setFocusMode(nextTab === 'workspace');
    navigate(`/project/${linkedProject.id}/${nextTab}`, { replace: true });
    clearSharedProjectParams();
  }, [clearSharedProjectParams, navigate, projects, requestedTab, setFocusMode, sharedProjectId, user]);

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
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
      <div className="loading-spinner"></div>
      <div style={{ marginLeft: '10px' }}>Loading BOQ Pro...</div>
    </div>
  );

  if (view === 'landing') return <Hero onGetStarted={() => setView(user ? 'app' : 'pricing')} onLogin={() => setView(user ? 'app' : 'login')} />;
  if (view === 'pricing') return <PricingPage
    error={authError}
    userEmail={user?.email}
    onSelectPlan={handleSelectPlan}
    onLogin={() => setView(user ? 'app' : 'login')}
    onBack={() => { setAuthError(null); setView(user ? 'app' : 'landing'); }}
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
  />;
  if (view === 'signup') return <SignUp error={authError} selectedPlan={selectedPlan} onSignUp={handleSignUp} onSwitchToLogin={(target) => { setAuthError(null); setView(target); }} onViewTerms={() => setView('terms')} onViewPrivacy={() => setView('privacy')} />;
  if (view === 'verification') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ borderRadius: '50%', background: 'rgba(37, 99, 235, 0.2)', padding: '20px', marginBottom: '10px' }}>
        <Mail size={48} className="text-accent" />
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
        {verificationEmailStatus === 'failed' ? 'Verification email not sent yet' : 'Check your inbox'}
      </h2>
      <p style={{ color: '#94a3b8', maxWidth: '420px', lineHeight: 1.6 }}>
        {verificationEmailStatus === 'failed'
          ? <>Your account was created for <strong style={{ color: 'white' }}>{pendingUser?.email || user?.email}</strong>, but the verification email did not go out. Use <strong style={{ color: 'white' }}>Resend Email</strong> to try again.</>
          : <>We've sent a verification link to<br/><strong style={{ color: 'white' }}>{pendingUser?.email || user?.email}</strong>. Please click the link to activate your account.</>}
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
        <button onClick={handleResendCode} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Resend Email</button>
        <button onClick={() => setView('login')} style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Back to Login</button>
      </div>
    </div>
  );
  if (view === 'forgot-password') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', flexDirection: 'column', gap: '1rem', fontFamily: 'Inter, sans-serif' }}>
      <h2>🔑 Password Reset</h2>
      <p style={{ color: '#94a3b8', maxWidth: '400px', textAlign: 'center' }}>Password reset is handled via Firebase. Please use the Firebase Console or contact support to reset your password.</p>
      <button onClick={() => setView('login')} style={{ padding: '0.75rem 2rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>Back to Login</button>
    </div>
  );
  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  // ── Main App Routing ──
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={
          <ProjectDashboard
            user={user}
            projects={projects}
            onCreateProject={handleCreateProject}
            onSelectProject={openWorkspace}
            onDeleteProject={handleDeleteProject}
            onUpgrade={() => setView('pricing')}
          />
        } />

        <Route path="project/:projectId/workspace" element={
          activeProject ? (
            <BOQWorkspace
              key={activeProject.id}
              project={activeProject}
              launchIntent={workspaceIntent}
              onLaunchIntentHandled={clearWorkspaceIntent}
              onUpdate={handleUpdateProject}
              onAddSection={() => handleAddSection(activeProject.id)}
              onExport={() => setActiveTab('reports', activeProject.id)}
              onDelete={handleDeleteSectionOrItem}
            />
          ) : (
            <div className="enterprise-card p-4">Loading project Workspace...</div>
          )
        } />

        <Route path="project/:projectId/library" element={
          activeProject ? (
            <MaterialLibrary user={user} activeProject={activeProject} onUpdate={handleUpdateProject} onUpgrade={() => setView('pricing')} />
          ) : (
            <div className="enterprise-card p-4">Loading project library...</div>
          )
        } />

        <Route path="project/:projectId/reports" element={
          activeProject ? (
            <Reports user={user} projects={projects} activeProjectId={activeProjectId} onUpgrade={() => setView('pricing')} />
          ) : (
            <div className="enterprise-card p-4">Loading project reports...</div>
          )
        } />

        <Route path="settings" element={<Settings user={user} onUpgrade={() => setView('pricing')} />} />
        
        <Route path="methodology" element={<CalculationMethodology />} />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ToastProvider>
          <AuthProvider>
            <ProjectsProvider>
              <MainApp />
            </ProjectsProvider>
          </AuthProvider>
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
