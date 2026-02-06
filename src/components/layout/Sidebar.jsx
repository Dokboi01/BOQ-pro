import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Database,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, onViewPlans }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
    { id: 'workspace', label: 'BOQ Workspace', icon: FileSpreadsheet },
    { id: 'library', label: 'Price Library', icon: Database },
    { id: 'reports', label: 'Documents & Export', icon: FileText },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <Building2 size={24} className="logo-icon" />
          {!collapsed && <span className="logo-text">BOQ Pro</span>}
        </div>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && user?.plan === 'Free' && (
        <div className="upgrade-prompt">
          <h4>Upgrade to Pro</h4>
          <p>Get unlimited projects and AI-powered insights.</p>
          <button className="btn-upgrade" onClick={onViewPlans}>View Plans</button>
        </div>
      )}

      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="user-profile">
            <div className="user-avatar">
              {(user.full_name || user.email || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.full_name || 'Practitioner'}</span>
              <span className="user-plan">{user.plan || 'Free'} Plan</span>
            </div>
          </div>
        )}
        <button className="nav-item" onClick={() => setActiveTab('settings')}>
          <Settings size={20} />
          {!collapsed && <span>Settings</span>}
        </button>
        <button className="nav-item text-danger" onClick={onLogout}>
          <LogOut size={20} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      <style jsx="true">{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: var(--primary-900);
          color: white;
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-right: 1px solid rgba(255,255,255,0.1);
          position: sticky;
          top: 0;
        }

        .sidebar.collapsed {
          width: 72px;
        }

        .sidebar-header {
          padding: 1.5rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--accent-400);
        }

        .logo-text {
          font-weight: 800;
          font-size: 1.125rem;
          letter-spacing: -0.5px;
          color: white;
        }

        .collapse-btn {
          background: rgba(255,255,255,0.05);
          border: none;
          color: var(--primary-500);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .collapse-btn:hover {
          color: white;
          background: rgba(255,255,255,0.1);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0.75rem;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--primary-500);
          text-align: left;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .nav-item.active {
          background: var(--accent-600);
          color: white;
        }

        .upgrade-prompt {
          margin: 1rem 0.75rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, var(--accent-600), var(--accent-400));
          border-radius: var(--radius-md);
          color: white;
        }

        .upgrade-prompt h4 {
          color: white;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .upgrade-prompt p {
          font-size: 0.75rem;
          opacity: 0.9;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .btn-upgrade {
          width: 100%;
          background: white;
          color: var(--accent-600);
          border: none;
          padding: 0.5rem;
          border-radius: var(--radius-xs);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 0.5rem;
          margin-bottom: 0.5rem;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: var(--accent-600);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-plan {
          font-size: 0.75rem;
          color: var(--primary-400);
        }

        .sidebar-footer {
          padding: 1rem 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .text-danger {
          color: #f87171 !important;
        }

        .text-danger:hover {
          background: rgba(248, 113, 113, 0.1);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
