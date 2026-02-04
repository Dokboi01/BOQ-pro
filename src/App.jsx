import React, { useState } from 'react';
import Hero from './components/landing/Hero';
import PricingPage from './components/landing/Pricing';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Onboarding from './components/onboarding/Onboarding';
import Sidebar from './components/layout/Sidebar';
import ProjectDashboard from './components/dashboard/ProjectDashboard';
import EmailVerification from './components/auth/EmailVerification';
import { STRUCTURE_DATA } from './data/structures';
import { PLAN_LIMITS, PLAN_NAMES } from './data/plans';
import { supabase } from './db/supabase';
import { saveProject, getProjects, getProfile, updateProfile, deleteProject } from './db/database';
import BOQWorkspace from './components/workspace/BOQWorkspace';
import MaterialLibrary from './components/workspace/MaterialLibrary';
import Reports from './components/workspace/Reports';
import Settings from './components/dashboard/Settings';
import StructureSelector from './components/dashboard/StructureSelector';
import {
  BarChart3,
  MapPin,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Target,
  LogOut,
  Settings as SettingsIcon,
  CreditCard,
  FileCheck,
  Calculator as CalcIcon
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
  const [user, setUser] = useState(null);
  const [view, setView] = useState('loading');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authError, setAuthError] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pendingUser, setPendingUser] = useState(null);
  const initializationComplete = React.useRef(false);

  // Check for active session on mount
  React.useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        console.log('Checking user session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session && isMounted) {
          console.log('Session found:', session.user.email);
          const profile = await getProfile();
          console.log('Profile found:', profile);
          setUser({ ...session.user, ...profile });
          initializationComplete.current = true;
          setView('app');
        } else if (isMounted) {
          console.log('No session, showing landing');
          initializationComplete.current = true;
          setView('landing');
        }
      } catch (err) {
        console.error('Core initialization failed:', err);
        if (isMounted) setView('landing');
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session) {
        const profile = await getProfile();
        setUser({ ...session.user, ...profile });
        initializationComplete.current = true;
        setView('app');
      } else {
        setUser(null);
        setView('landing');
      }
    });

    // Fallback if still loading after 5 seconds
    const timer = setTimeout(() => {
      if (isMounted && !initializationComplete.current) {
        console.warn('Initialization timed out, falling back to landing');
        setView('landing');
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Load projects from Supabase when user is set
  React.useEffect(() => {
    if (user) {
      const loadData = async () => {
        const storedProjects = await getProjects();
        setProjects(storedProjects);
      };
      loadData();
    }
  }, [user]);

  const handleLogin = async (credentials) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      setAuthError(error.message);
      return;
    }
  };

  const handleSignUp = async (data) => {
    setAuthError(null);
    const { data: res, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          plan: selectedPlan || PLAN_NAMES.FREE,
        }
      }
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (res.user && res.session === null) {
      // Email verification required
      setPendingUser(data);
      setView('verification');

      // Also send the custom code via our mail service for a professional touch
      // Note: This matches the 6-digit code generated in SignUp.jsx
      import('./utils/mailService').then(m => {
        m.sendVerificationEmail(data.email, data.verificationCode);
      });
    }
  };

  const handleVerify = async (code) => {
    console.log('Verifying code:', code);

    // Check if it's our custom verification code (Better for Electron compatibility)
    if (pendingUser && code === pendingUser.verificationCode) {
      console.log('Custom code verified successfully');
      // In a real app, we'd confirm the user in Supabase here via edge function
      // For now, we'll proceed to the app view. The user will be fully verified 
      // once they click the link in their mail at any time.
      setView('app');
      return true;
    }

    // Fallback to Supabase native OTP verification
    const { error } = await supabase.auth.verifyOtp({
      email: pendingUser?.email,
      token: code,
      type: 'signup'
    });

    if (error) {
      console.error('Supabase OTP verification failed:', error.message);
      return false;
    }
    return true;
  };

  const handleResendCode = async () => {
    if (!pendingUser) return;
    await supabase.auth.resend({
      type: 'signup',
      email: pendingUser.email,
    });
  };

  const handleOnboardingComplete = async (data) => {
    const updatedProfile = await updateProfile({
      role: data.userType,
      is_onboarded: true
    });
    if (updatedProfile) {
      setUser(prev => ({ ...prev, ...updatedProfile }));
      setView('app');
    }
  };

  const handleCreateProject = () => {
    const limits = PLAN_LIMITS[user?.plan] || PLAN_LIMITS[PLAN_NAMES.FREE];
    if (projects.length >= limits.maxProjects) {
      setView('pricing');
      return;
    }
    setShowSelector(true);
  };

  const handleStructureSelect = async (structureId, structureName) => {
    const data = STRUCTURE_DATA[structureId] || STRUCTURE_DATA['Residential Building'];

    const newProj = {
      name: `Project: ${structureName}`,
      type: structureId,
      status: 'Draft',
      sections: data.sections.map(s => ({
        ...s,
        items: s.items.map(item => ({
          ...item,
          id: Math.random(),
          total: item.qty * item.rate,
          useBenchmark: true
        }))
      })),
      date: new Date().toLocaleDateString()
    };

    const id = await saveProject(newProj);
    const updated = await getProjects();
    setProjects(updated);
    setActiveProjectId(id);
    setShowSelector(false);
    setActiveTab('workspace');
  };

  const handleUpdateProject = async (projectId, updatedSections) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedProject = { ...project, sections: updatedSections };
    await saveProject(updatedProject);

    // Refresh local state
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
  };

  const handleDeleteProject = async (projectId) => {
    const success = await deleteProject(projectId);
    if (success) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setActiveTab('dashboard');
      }
    } else {
      alert('Failed to delete project. Please try again.');
    }
  };

  const calculateTotalValue = () => {
    try {
      const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
      if (!activeProject || !activeProject.sections) return 0;

      return activeProject.sections.reduce((acc, section) => {
        if (!section || !section.items) return acc;
        return acc + section.items.reduce((itemAcc, item) => itemAcc + (item.total || 0), 0);
      }, 0);
    } catch (err) {
      console.error('calculateTotalValue error:', err);
      return 0;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('landing');
  };

  if (view === 'loading') return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
      <div className="loading-spinner"></div>
      <div style={{ marginLeft: '10px' }}>Loading BOQ Pro...</div>
    </div>
  );

  if (view === 'landing') return <Hero onGetStarted={() => setView('pricing')} />;
  if (view === 'pricing') return <PricingPage
    onSelectPlan={async (plan) => {
      if (user) {
        const updatedProfile = await updateProfile({ plan });
        if (updatedProfile) {
          setUser(prev => ({ ...prev, ...updatedProfile }));
          setView('app');
        }
      } else {
        setSelectedPlan(plan);
        setView('signup');
      }
    }}
    onBack={() => setView(user ? 'app' : 'landing')}
  />;
  if (view === 'login') return <Login error={authError} onLogin={handleLogin} onSwitchToSignUp={() => { setAuthError(null); setView('signup'); }} onForgotPassword={() => setView('forgot-password')} />;
  if (view === 'signup') return <SignUp error={authError} selectedPlan={selectedPlan} onSignUp={handleSignUp} onSwitchToLogin={(target) => { setAuthError(null); setView(target); }} />;
  if (view === 'verification') return (
    <EmailVerification
      email={pendingUser?.email}
      onVerify={handleVerify}
      onResend={handleResendCode}
      onBack={() => setView('signup')}
    />
  );
  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  const renderContent = () => {
    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

    switch (activeTab) {
      case 'dashboard':
        return <ProjectDashboard
          user={user}
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            setActiveTab('workspace');
          }}
          onDeleteProject={handleDeleteProject}
          onUpgrade={() => { setView('pricing'); }}
        />;
      case 'workspace':
        return activeProject ? (
          <div className="view-fade-in"><BOQWorkspace key={activeProject.id} project={activeProject} onUpdate={handleUpdateProject} /></div>
        ) : (
          <div className="enterprise-card p-4">No project selected.</div>
        );
      case 'library':
        return <div className="view-fade-in"><MaterialLibrary user={user} activeProject={activeProject} onUpdate={handleUpdateProject} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'reports':
        return <div className="view-fade-in"><Reports user={user} projects={projects} activeProjectId={activeProjectId} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'settings':
        return <div className="view-fade-in"><Settings user={user} /></div>;
      default:
        return <div className="enterprise-card p-4">Feature development in progress...</div>;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={logout} />

      <main className="content-area">
        {/* Sticky Summary Bar (Decision Support) */}
        <div className="sticky-summary-bar">
          <div className="summary-item">
            <span className="label">ESTIMATED COST</span>
            <span className="val">₦{calculateTotalValue().toLocaleString()}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="label">VARIANCE</span>
            <span className={`val ${projects.length > 0 ? 'text-success' : ''}`}>₦0.00</span>
          </div>
          <div className="summary-item status">
            <ShieldCheck size={14} className="text-success" />
            <span className="status-text">{user?.plan?.toUpperCase()} PLAN ACTIVE</span>
          </div>
        </div>

        <header className="topbar">
          <div className="project-info">
            {projects.length > 0 ? (
              <>
                <h1>
                  {projects.find(p => p.id === activeProjectId)?.name || projects[0]?.name || 'Untitiled Project'}
                  <span className="status-badge">
                    {projects.find(p => p.id === activeProjectId)?.status || projects[0]?.status || 'Draft'}
                  </span>
                </h1>
                <div className="meta-row">
                  <span className="meta-item"><MapPin size={14} /> Lagos - Algiers Sector</span>
                  <span className="meta-item"><UserIcon size={14} /> {user?.full_name || 'Practitioner'}</span>
                  <span className="meta-item"><Calendar size={14} /> Q1 2026</span>
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
            <button className="btn-secondary" onClick={() => setActiveTab('settings')}><SettingsIcon size={16} /> Settings</button>
            <button className="btn-primary" onClick={handleCreateProject}>Create New Project</button>
          </div>
        </header>

        {renderContent()}

        {showSelector && <StructureSelector
          onSelect={handleStructureSelect}
          onClose={() => setShowSelector(false)}
        />}
      </main>


      <style jsx="true">{`
        .app-container {
          display: flex;
          min-height: 100vh;
        }

        .content-area {
          flex: 1;
          padding: 1rem 3rem 3rem;
          background: var(--bg-main);
          overflow-y: auto;
          position: relative;
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
          color: var(--primary-500);
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
        }

        .meta-item {
          font-size: 0.875rem;
          color: var(--primary-500);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .topbar-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-secondary {
          background: white;
          border: 1px solid var(--border-medium);
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .text-success { color: #4ade80; }
        .text-warning { color: var(--warning-600); }
        .text-danger { color: #f87171; }
      `}</style>
    </div>
  );
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
