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
  Building2,
  Gavel,
  BookOpen
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, user, onLogout, onViewPlans }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
    { id: 'workspace', label: 'BOQ Workspace', icon: FileSpreadsheet },
    { id: 'tendering', label: 'Tendering & Bids', icon: Gavel },
    { id: 'library', label: 'Price Library', icon: Database },
    { id: 'reports', label: 'Documents & Export', icon: FileText },
    { id: 'methodology', label: 'Calculations Guide', icon: BookOpen },
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
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          color: white;
          display: flex;
          flex-direction: column;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-right: 1px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          box-shadow: 4px 0 25px rgba(0, 0, 0, 0.15);
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
          border-radius: 10px;
          border: none;
          background: transparent;
          color: rgba(148, 163, 184, 0.9);
          text-align: left;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.07);
          color: white;
          transform: translateX(4px);
        }

        .nav-item.active {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
          font-weight: 600;
        }

        .upgrade-prompt {
          margin: 1rem 0.75rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          border-radius: 12px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .upgrade-prompt::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .upgrade-prompt h4 {
          color: white;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          font-weight: 800;
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
          color: #2563eb;
          border: none;
          padding: 0.625rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-upgrade:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 0.5rem;
          margin-bottom: 0.5rem;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.875rem;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
          position: relative;
        }

        .user-avatar::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid #0f172a;
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

        /* ── MOBILE: Bottom Navigation Bar ── */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            top: auto;
            width: 100% !important;
            height: 64px;
            flex-direction: row;
            align-items: center;
            z-index: 1000;
            border-right: none;
            border-top: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 -4px 24px rgba(0,0,0,0.3);
            padding: 0 0.5rem;
            overflow: hidden;
          }

          .sidebar-header {
            display: none;
          }

          .sidebar-nav {
            flex: 1;
            flex-direction: row;
            padding: 0;
            gap: 0;
            height: 100%;
            align-items: stretch;
            justify-content: space-around;
          }

          .nav-item {
            flex: 1;
            flex-direction: column;
            gap: 3px;
            padding: 8px 4px;
            font-size: 0.55rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            text-align: center;
            border-radius: 8px;
            min-height: 52px;
            justify-content: center;
          }

          .nav-item span {
            display: block !important;
            font-size: 0.55rem;
          }

          .nav-item:hover {
            transform: translateY(-2px);
          }

          .upgrade-prompt {
            display: none;
          }

          .sidebar-footer {
            display: flex;
            flex-direction: row;
            border-top: none;
            padding: 0;
            gap: 0;
            align-items: stretch;
          }

          .sidebar-footer .nav-item {
            flex: 1;
            flex-direction: column;
            gap: 3px;
            font-size: 0.55rem;
          }

          .user-profile {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
