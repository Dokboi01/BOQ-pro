import React, { useState } from 'react';
import Hero from './components/landing/Hero';
import PricingPage from './components/landing/Pricing';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Onboarding from './components/onboarding/Onboarding';
import Sidebar from './components/layout/Sidebar';
import ProjectDashboard from './components/dashboard/ProjectDashboard';
import BOQWorkspace from './components/workspace/BOQWorkspace';
import MaterialLibrary from './components/workspace/MaterialLibrary';
import Reports from './components/workspace/Reports';
import Settings from './components/dashboard/Settings';
import StructureSelector from './components/dashboard/StructureSelector';
import { STRUCTURE_DATA } from './data/structures';
import { PLAN_LIMITS, PLAN_NAMES } from './data/plans';
import {
  BarChart3,
  MapPin,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Target,
  LogOut,
  Settings as SettingsIcon
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('boq_pro_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [view, setView] = useState(() => {
    const savedUser = localStorage.getItem('boq_pro_user');
    return savedUser ? 'app' : 'landing';
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSelector, setShowSelector] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('boq_pro_projects');
    return savedProjects ? JSON.parse(savedProjects) : [];
  });

  const handleLogin = (credentials) => {
    const mockUser = {
      name: credentials.email.split('@')[0],
      email: credentials.email,
      plan: 'Pro',
      role: 'Engineer',
      isOnboarded: true
    };
    setUser(mockUser);
    localStorage.setItem('boq_pro_user', JSON.stringify(mockUser));
    setView('app');
  };

  const handleSignUp = (data) => {
    const newUser = {
      name: data.fullName,
      email: data.email,
      plan: selectedPlan || PLAN_NAMES.FREE,
      isOnboarded: false
    };
    setUser(newUser);
    setProjects([]); // Ensure new users start with empty projects
    localStorage.removeItem('boq_pro_projects'); // Clear any old session projects
    setView('onboarding');
  };

  const handleOnboardingComplete = (data) => {
    const updatedUser = { ...user, role: data.userType, isOnboarded: true };
    setUser(updatedUser);
    localStorage.setItem('boq_pro_user', JSON.stringify(updatedUser));
    setView('app');
  };

  const handleCreateProject = () => {
    setShowSelector(true);
  };

  const handleStructureSelect = (structureId, structureName) => {
    const data = STRUCTURE_DATA[structureId] || STRUCTURE_DATA['Residential Building'];
    // Fallback in case of missing data for a type

    const newProj = {
      id: Date.now(),
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
      date: 'Just now'
    };

    const updated = [...projects, newProj];
    setProjects(updated);
    localStorage.setItem('boq_pro_projects', JSON.stringify(updated));
    setActiveProjectId(newProj.id);
    setShowSelector(false);
    setActiveTab('workspace');
  };

  const handleUpdateProject = (projectId, updatedSections) => {
    const updated = projects.map(p =>
      p.id === projectId ? { ...p, sections: updatedSections } : p
    );
    setProjects(updated);
    localStorage.setItem('boq_pro_projects', JSON.stringify(updated));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('boq_pro_user');
    setView('landing');
  };

  if (view === 'landing') return <Hero onGetStarted={() => setView('pricing')} />;
  if (view === 'pricing') return <PricingPage
    onSelectPlan={(plan) => {
      if (user) {
        const updatedUser = { ...user, plan };
        setUser(updatedUser);
        localStorage.setItem('boq_pro_user', JSON.stringify(updatedUser));
        setView('app');
      } else {
        setSelectedPlan(plan);
        setView('signup');
      }
    }}
    onBack={() => setView(user ? 'app' : 'landing')}
  />;
  if (view === 'login') return <Login onLogin={handleLogin} onSwitchToSignUp={() => setView('signup')} />;
  if (view === 'signup') return <SignUp selectedPlan={selectedPlan} onSignUp={handleSignUp} onSwitchToLogin={(target) => setView(target)} />;
  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  const renderContent = () => {
    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

    switch (activeTab) {
      case 'dashboard':
        return <ProjectDashboard
          user={user}
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={(id) => { setActiveProjectId(id); setActiveTab('workspace'); }}
          onUpgrade={() => { setView('pricing'); }}
        />;
      case 'workspace':
        return <div className="view-fade-in"><BOQWorkspace key={activeProject?.id} project={activeProject} onUpdate={handleUpdateProject} /></div>;
      case 'library':
        return <div className="view-fade-in"><MaterialLibrary user={user} onUpgrade={() => { setView('pricing'); }} /></div>;
      case 'reports':
        return <div className="view-fade-in"><Reports user={user} onUpgrade={() => { setView('pricing'); }} /></div>;
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
            <span className="val">{projects.length > 0 ? '₦248.5M' : '₦0.00'}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="label">VARIANCE</span>
            <span className={`val ${projects.length > 0 ? 'text-success' : ''}`}>{projects.length > 0 ? '+₦1.5M' : '₦0.00'}</span>
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
                  <span className="meta-item"><UserIcon size={14} /> {user?.name || 'Practitioner'}</span>
                  <span className="meta-item"><Calendar size={14} /> Q1 2026</span>
                </div>
              </>
            ) : (
              <>
                <h1>Welcome, {user?.name || 'Practitioner'}</h1>
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

export default App;
