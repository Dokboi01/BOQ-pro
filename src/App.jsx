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
import DrawingAnalyzer from './components/workspace/DrawingAnalyzer';
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
  Calculator as CalcIcon,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2
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
  const [focusMode, setFocusMode] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const initializationComplete = React.useRef(false);

  // Check for active session on mount
  React.useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      try {
        console.log('🔄 INITIALIZING AUTH...');

        // 1. FAST PATH: UI Caching
        const cachedProfile = localStorage.getItem('boq_pro_profile');
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            console.log('✨ Using cached profile:', parsed.full_name);
            setUser(parsed);
            setView('app');
          } catch {
            localStorage.removeItem('boq_pro_profile');
          }
        }

        // 2. SESSION CHECK (Silent)
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          console.log('✅ Active session found:', session.user.email);
          const profile = await getProfile(session.user.id);
          const fullUser = { ...session.user, ...profile };
          setUser(fullUser);
          localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
          initializationComplete.current = true;
          setView('app');
        } else {
          console.log('ℹ️ No active session');
          localStorage.removeItem('boq_pro_profile');
          setUser(null);
          initializationComplete.current = true;
          if (view === 'loading') setView('landing');
        }
      } catch (err) {
        console.error('❌ Init error:', err);
        initializationComplete.current = true;
        setView('landing');
      }
    };

    checkUser();

    // 3. AUTH STATE LISTENER (Global)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AUTH EVENT:', event, !!session);
      if (!isMounted) return;

      if (session) {
        // Only trigger profile fetch on sign-in related events to avoid loops
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const profile = await getProfile(session.user.id);
          const fullUser = { ...session.user, ...profile };
          setUser(fullUser);
          localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
          initializationComplete.current = true;
          setView('app');
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('boq_pro_profile');
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    console.log('🚀 Attempting login for:', credentials.email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);

      // MOCK BYPASS for development/demonstration
      if (credentials.email === 'guest@boqpro.com') {
        console.log('✨ Guest Login Bypass Triggered');
        const mockUser = {
          id: 'mock-123',
          email: 'guest@boqpro.com',
          full_name: 'Guest Engineer',
          plan: 'pro'
        };
        setUser(mockUser);
        localStorage.setItem('boq_pro_profile', JSON.stringify(mockUser));
        setView('app');
        return;
      }

      setAuthError(error.message);
      return;
    }

    if (data.session) {
      console.log('✅ Login successful, updating UI...');
      const profile = await getProfile(data.user.id);
      const fullUser = { ...data.user, ...profile };
      setUser(fullUser);
      localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
      setView('app');
    }
  };

  const handleSignUp = async (data) => {
    setAuthError(null);
    console.log('🚀 Attempting Supabase Signup for:', data.email);

    try {
      // 10s Timeout for Signup - browser default is too long
      const signupPromise = supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            plan: selectedPlan || PLAN_NAMES.FREE,
          }
        }
      });

      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 10000));
      const result = await Promise.race([signupPromise, timeoutPromise]);

      if (result === 'TIMEOUT') {
        setAuthError('Signup is taking too long. This looks like a connection issue with Supabase.');
        return;
      }

      const { data: res, error } = result;

      if (error) {
        console.error('❌ Supabase Signup Error:', error.message);
        setAuthError(error.message);
        return;
      }

      if (res.user && res.session === null) {
        console.log('📬 Signup successful, email verification required.');
        setPendingUser(data);
        setView('verification');
      } else if (res.user && res.session) {
        console.log('✨ Signup successful, user logged in directly.');
        const profile = await getProfile(res.user.id);
        const fullUser = { ...res.user, ...profile };
        setUser(fullUser);
        setView('app');
      }
    } catch (err) {
      console.error('❌ Critical Signup Crash:', err);
      setAuthError('Could not reach verification server. Please check your internet connection.');
    }
  };

  const handleVerify = async (code) => {
    console.log('Verifying code with Supabase:', code);

    // Supabase native OTP verification
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
    if (structureId === 'ai-analysis') {
      setShowSelector(false);
      setShowAnalyzer(true);
      return;
    }

    console.log('Selected structure:', structureId);
    console.log('Available keys:', Object.keys(STRUCTURE_DATA));

    const data = STRUCTURE_DATA[structureId] || STRUCTURE_DATA['Residential Building'];

    if (!data) {
      console.error('❌ CRITICAL: No data found for structureId:', structureId);
      alert('Could not find components for this structure type.');
      return;
    }

    if (!data.sections) {
      console.error('❌ CRITICAL: Data found but contains no sections:', data);
      alert('This structure type has no predefined sections.');
      return;
    }

    console.log('✅ Structure metadata found:', {
      icon: data.icon,
      description: data.description,
      sectionCount: data.sections.length
    });

    const newProj = {
      name: `Project: ${structureName}`,
      type: structureId,
      status: 'Draft',
      sections: data.sections.map(s => {
        const items = s.items || [];
        console.log(`📍 Mapping section [${s.title}] with ${items.length} items`);

        return {
          ...s,
          expanded: true,
          items: items.map(item => ({
            ...item,
            id: Math.random().toString(36).substr(2, 9), // Use string ID
            qty: item.qty || 0,
            rate: item.rate || 0,
            total: (item.qty || 0) * (item.rate || 0),
            useBenchmark: true
          }))
        };
      }),
      date: new Date().toLocaleDateString()
    };

    console.log('🚀 FINAL NEW PROJECT OBJECT:', newProj);

    try {
      const savedId = await saveProject(newProj);

      // Use database ID if available, otherwise generate a local ID
      const projectId = savedId || `local_${Date.now()}`;
      const finalProj = { ...newProj, id: projectId };

      if (!savedId) {
        console.warn('⚠️ Project saved locally only (DB save failed). ID:', projectId);
      } else {
        console.log('💾 Project saved to database, ID:', savedId);
      }

      // Update local state immediately
      setProjects(prev => [finalProj, ...prev]);
      setActiveProjectId(projectId);
      setShowSelector(false);
      setActiveTab('workspace');
      setFocusMode(true);
      console.log('✨ Workspace navigation triggered with project:', projectId);

      // Only refresh from DB if save was successful
      if (savedId) {
        getProjects().then(updated => {
          console.log('🔄 Background refresh completed, projects count:', updated.length);
          if (updated.length > 0) {
            setProjects(updated);
          }
        });
      }
    } catch (dbError) {
      console.error('❌ Database operation failed during structure selection:', dbError);

      // Fallback: Create project locally so user can still work
      const localId = `local_${Date.now()}`;
      const fallbackProj = { ...newProj, id: localId };

      setProjects(prev => [fallbackProj, ...prev]);
      setActiveProjectId(localId);
      setShowSelector(false);
      setActiveTab('workspace');
      setFocusMode(true);

      console.warn('⚠️ Created local-only project due to DB error:', localId);
    }
  };

  const handleAnalysisComplete = async (elements) => {
    console.log('Analysis complete, elements:', elements);

    // Convert elements to BOQ sections
    const analyzedSections = elements.map(el => ({
      id: Math.random().toString(36).substr(2, 9),
      title: el.title,
      expanded: true,
      items: Array.from({ length: 3 }).map((_, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        description: `Identified Component ${idx + 1} from ${el.title}`,
        unit: 'm³',
        qty: Math.floor(Math.random() * 50) + 10,
        rate: 0,
        total: 0,
        isAnalyzed: true
      }))
    }));

    const newProj = {
      name: `AI Draft: ${new Date().toLocaleDateString()}`,
      type: 'AI Drawing Analysis',
      status: 'Draft',
      sections: analyzedSections,
      date: new Date().toLocaleDateString()
    };

    try {
      const savedId = await saveProject(newProj);
      const projectId = savedId || `local_${Date.now()}`;
      const finalProj = { ...newProj, id: projectId };

      setProjects(prev => [finalProj, ...prev]);
      setActiveProjectId(projectId);
      setShowAnalyzer(false);
      setActiveTab('workspace');
      setFocusMode(true);

      if (savedId) {
        getProjects().then(updated => setProjects(updated));
      }
    } catch (err) {
      console.error('Error creating project from analysis:', err);
    }
  };

  const handleUpdateProject = async (projectId, updatedSections) => {
    // 1. OPTIMISTIC UPDATE: Update local state immediately
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, sections: updatedSections } : p));

    // 2. BACKGROUND SAVE: Don't await this for UI update
    saveProject({
      id: projectId,
      sections: updatedSections
    }).catch(err => {
      console.error('❌ Background save failed:', err);
      // Optional: Rollback state if critical, but for now we trust the local state
    });
  };

  const handleAddSection = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newSection = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Workspace Section',
      expanded: true,
      items: []
    };

    const updatedSections = [...(project.sections || []), newSection];
    await handleUpdateProject(projectId, updatedSections);
  };

  const handleDeleteSectionOrItem = async (projectId, sectionId, itemId = null) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    let updatedSections;
    if (itemId) {
      // Delete specific item
      updatedSections = project.sections.map(s => {
        if (s.id !== sectionId) return s;
        return { ...s, items: s.items.filter(i => i.id !== itemId) };
      });
    } else {
      // Delete entire section
      updatedSections = project.sections.filter(s => s.id !== sectionId);
    }

    await handleUpdateProject(projectId, updatedSections);
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

  const calculateTotalValue = React.useMemo(() => {
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
  }, [projects, activeProjectId]);

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

  if (view === 'landing') return <Hero onGetStarted={() => setView('pricing')} onLogin={() => setView('login')} />;
  if (view === 'pricing') return <PricingPage
    error={authError}
    onSelectPlan={async (plan) => {
      setAuthError(null);

      // 1. FAST PATH: Guest/Mock User Bypass
      if (user && (user.id?.startsWith('mock-') || user.email === 'guest@boqpro.com')) {
        console.log('✨ Local Plan Selection (Mock User)');
        const updated = { ...user, plan };
        setUser(updated);
        localStorage.setItem('boq_pro_profile', JSON.stringify(updated));
        setView('app');
        return;
      }

      if (user) {
        try {
          console.log('📡 Syncing plan selection with database:', plan);

          // Safety race: 4s timeout for real database updates
          const profilePromise = updateProfile({ plan });
          const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 4000));

          const result = await Promise.race([profilePromise, timeoutPromise]);

          if (result === 'TIMEOUT') {
            console.warn('⚠️ DB Sync timed out, applying locally');
            setAuthError('Connection sync slow. Plan saved locally.');
            const localUpdate = { ...user, plan };
            setUser(localUpdate);
            localStorage.setItem('boq_pro_profile', JSON.stringify(localUpdate));
            // Show message for a moment then proceed
            setTimeout(() => setView('app'), 1500);
            return;
          }

          if (result) {
            setUser(prev => ({ ...prev, ...result }));
            setView('app');
          } else {
            // DB returned null or error
            console.warn('⚠️ DB update failed, falling back to local');
            const localUpdate = { ...user, plan };
            setUser(localUpdate);
            setView('app');
          }
        } catch (err) {
          console.error('❌ Plan selection crash:', err);
          const localUpdate = { ...user, plan };
          setUser(localUpdate);
          setView('app');
        }
      } else {
        setSelectedPlan(plan);
        setView('signup');
      }
    }}
    onBack={() => { setAuthError(null); setView(user ? 'app' : 'landing'); }}
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
        return <div className="view-fade-in"><Settings user={user} onUpgrade={() => setView('pricing')} /></div>;
      default:
        return <div className="enterprise-card p-4">Feature development in progress...</div>;
    }
  };

  return (
    <div className={`app-container ${focusMode ? 'focus-mode' : ''}`}>
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

      <main className="content-area">
        {/* Sticky Summary Bar (Decision Support) */}
        <div className="sticky-summary-bar">
          <div className="summary-item">
            <span className="label">ESTIMATED COST</span>
            <span className="val">₦{calculateTotalValue.toLocaleString()}</span>
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
            <button className="btn-primary" onClick={handleCreateProject}>Create New Project</button>
          </div>
        </header>

        {renderContent()}

        {showSelector && <StructureSelector
          onSelect={handleStructureSelect}
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
