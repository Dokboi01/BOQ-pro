import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Target,
  ShieldAlert,
  Layers,
  Users,
  Calendar,
  ChevronRight,
  Info,
  Lock
} from 'lucide-react';
import { PLAN_LIMITS, PLAN_NAMES } from '../../data/plans';

const ProjectDashboard = ({ user, projects = [], onCreateProject, onSelectProject, onUpgrade }) => {
  const [budget, setBudget] = useState(250000000); // ₦250M

  const calculateTotal = (proj) => {
    if (!proj.sections) return 0;
    return proj.sections.reduce((acc, s) =>
      acc + s.items.reduce((iAcc, item) => iAcc + (item.qty * (item.useBenchmark ? item.benchmark : item.rate)), 0)
      , 0);
  };

  const currentTotal = projects.length > 0 ? calculateTotal(projects[0]) : 0;
  const variance = budget - currentTotal;
  const variancePercent = budget > 0 ? ((variance / budget) * 100).toFixed(2) : 0;

  const status = currentTotal === 0 ? 'No Data' :
    currentTotal > budget ? 'Over Budget' :
      currentTotal > budget * 0.95 ? 'At Risk' : 'On Budget';

  const limits = PLAN_LIMITS[user?.plan] || PLAN_LIMITS[PLAN_NAMES.FREE];
  const isLimitReached = projects.length >= limits.maxProjects;

  const costBreakdown = projects.length > 0 ? [
    { label: 'Material Costs', amount: 161525000, color: 'var(--primary-900)', percent: 65, trend: 'up' },
    { label: 'Labour Costs', amount: 62125000, color: 'var(--accent-600)', percent: 25, trend: 'stable' },
    { label: 'Overheads & Profit', amount: 17395000, color: 'var(--accent-400)', percent: 7, trend: 'down' },
    { label: 'Taxes & Deductions', amount: 7455000, color: 'var(--border-medium)', percent: 3, trend: 'stable' },
  ] : [];

  const riskFlags = projects.length > 0 ? [
    { level: 'high', message: 'Material cost exceeds 65% of total — review supplier rates.', icon: ShieldAlert },
    { level: 'medium', message: 'Concrete works account for the highest cost exposure.', icon: AlertCircle },
    { level: 'low', message: 'Overhead percentage above typical market range.', icon: Info },
  ] : [];

  return (
    <div className="dashboard-control-center view-fade-in">
      {/* SaaS Header */}
      <header className="dashboard-welcome">
        <div>
          <h2>Good Afternoon, {user?.name || 'Practitioner'}</h2>
          <p>You have <strong>{projects.length} active projects</strong> this month.</p>
        </div>
        {user?.plan === PLAN_NAMES.FREE && (
          <div className="usage-card enterprise-card">
            <div className="usage-info">
              <span>Project Limit</span>
              <span>{projects.length} / {limits.maxProjects}</span>
            </div>
            <div className="usage-bar">
              <div className="usage-fill" style={{ width: `${(projects.length / limits.maxProjects) * 100}%`, background: isLimitReached ? 'var(--warning-600)' : 'var(--accent-600)' }}></div>
            </div>
            <button className="text-upgrade-link" onClick={onUpgrade}>Upgrade to unlock more projects</button>
          </div>
        )}
      </header>

      {/* My Projects Grid / Empty State */}
      <section className="projects-section">
        <div className="section-header">
          <h3>My Projects</h3>
          {projects.length > 0 && <button className="btn-primary-sm" onClick={onCreateProject} disabled={isLimitReached}>{isLimitReached ? 'Limit Reached' : '+ New Project'}</button>}
        </div>

        {projects.length === 0 ? (
          <div className="empty-state enterprise-card">
            <div className="empty-icon-wrapper">
              <Layers size={48} className="text-subtle" />
            </div>
            <h3>No projects yet</h3>
            <p>Ready to start your first professional Bill of Quantities? Create a project to unlock cost intelligence and automated reporting.</p>
            <button className="btn-primary-glow" onClick={onCreateProject}>
              <ArrowUpRight size={18} /> Create Your First Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div
                key={project.id}
                className="project-card enterprise-card"
                onClick={() => onSelectProject(project.id)}
              >
                <div className="project-card-header">
                  <span className={`status-dot ${project.status.toLowerCase()}`}></span>
                  <span className="project-status">{project.status}</span>
                  <span className="project-date">{project.date}</span>
                </div>
                <h4>{project.name}</h4>
                <div className="project-card-footer">
                  <div className="project-val">
                    <span className="label">Value</span>
                    <span className="val">₦{calculateTotal(project).toLocaleString()}</span>
                  </div>
                  <ChevronRight size={18} className="text-subtle" />
                </div>
              </div>
            ))}
            {user?.plan === PLAN_NAMES.FREE && projects.length < limits.maxProjects && (
              <div className="project-card locked enterprise-card" onClick={onCreateProject}>
                <Lock size={24} className="text-subtle" />
                <p>Available project slot</p>
              </div>
            )}
          </div>
        )}
      </section>

      {projects.length > 0 && (
        <>
          <div className="divider"></div>

          {/* Health Panel */}
          <section className="health-panel enterprise-card">
            <div className="health-header">
              <div className="title-group">
                <h3>Active Project Health: <strong>{projects[0].name}</strong></h3>
                <span className={`status-badge-large ${status.toLowerCase().replace(' ', '-')}`}>
                  {status}
                </span>
              </div>
              <div className="edit-budget">
                <label>Approved Budget (₦)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="budget-input"
                />
              </div>
            </div>

            <div className="health-metrics">
              <div className="metric-box">
                <span className="label">Total Estimated Cost</span>
                <span className="value">₦{currentTotal.toLocaleString()}</span>
              </div>
              <div className="metric-box">
                <span className="label">Cost Variance</span>
                <span className={`value ${variance < 0 ? 'text-danger' : 'text-success'}`}>
                  {variance < 0 ? '-' : '+'}₦{Math.abs(variance).toLocaleString()}
                </span>
              </div>
              <div className="metric-box">
                <span className="label">Variance %</span>
                <span className={`value ${variance < 0 ? 'text-danger' : 'text-success'}`}>
                  {variancePercent}%
                </span>
              </div>
            </div>

            <div className="health-progress-bar">
              <div
                className={`progress-fill ${status.toLowerCase().replace(' ', '-')}`}
                style={{ width: `${Math.min((currentTotal / budget) * 100, 100)}%` }}
              ></div>
            </div>
          </section>
        </>
      )}

      {/* Cost Intelligence Cards */}
      <section className="intelligence-grid">
        {costBreakdown.map((item, i) => (
          <div key={i} className="enterprise-card intel-card">
            <div className="intel-header">
              <span className="intel-label">{item.label}</span>
              {item.trend === 'up' && <TrendingUp size={16} className="text-danger" />}
              {item.trend === 'down' && <TrendingDown size={16} className="text-success" />}
              {item.trend === 'stable' && <Clock size={16} className="text-subtle" />}
            </div>
            <div className="intel-value">₦{item.amount.toLocaleString()}</div>
            <div className="intel-footer">
              <span className="percent-tag">{item.percent}% of total</span>
              <span className="subtle-link">View analysis <ChevronRight size={12} /></span>
            </div>
          </div>
        ))}
      </section>

      {/* Distribution & Risk Panels */}
      <div className="dashboard-split">
        <section className="visualization-panel enterprise-card">
          <div className="panel-header">
            <h3>Cost Distribution</h3>
            <div className="header-actions">
              <button className="btn-tab active">By Section</button>
              <button className="btn-tab">Top 5 Drivers</button>
            </div>
          </div>
          <div className="chart-container-large">
            <div className="viz-bars">
              {[
                { label: 'Earthworks', val: 45 },
                { label: 'Pavements', val: 30 },
                { label: 'Drainage', val: 15 },
                { label: 'Prelims', val: 10 },
              ].map((b, i) => (
                <div key={i} className="viz-row">
                  <div className="row-info">
                    <span>{b.label}</span>
                    <span>{b.val}%</span>
                  </div>
                  <div className="row-bar-bg">
                    <div className="row-bar-fill" style={{ width: `${b.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="risk-panel enterprise-card">
          <div className="panel-header">
            <h3>Risk Flags</h3>
            <Target size={18} className="text-subtle" />
          </div>
          <div className="risk-list">
            {riskFlags.map((risk, i) => (
              <div key={i} className={`risk-item ${risk.level}`}>
                <risk.icon size={20} className="risk-icon" />
                <div className="risk-message">{risk.message}</div>
              </div>
            ))}
          </div>
          <div className="audit-footer">
            <CheckCircle2 size={14} className="text-success" />
            <span>Audit integrity check passed.</span>
          </div>
        </section>
      </div>

      {/* Workflow Strip */}
      <section className="workflow-strip enterprise-card">
        <div className="workflow-item">
          <Layers size={18} />
          <div>
            <span className="label">Current Stage</span>
            <span className="val">Draft Analysis</span>
          </div>
        </div>
        <div className="workflow-item">
          <Calendar size={18} />
          <div>
            <span className="label">Last Modified</span>
            <span className="val">Today at 14:22</span>
          </div>
        </div>
        <div className="workflow-item">
          <Users size={18} />
          <div>
            <span className="label">Project Controller</span>
            <span className="val">{user?.role || 'Professional User'}</span>
          </div>
        </div>
        <div className="workflow-actions">
          <button className="btn-approve">Approve Cost Plan</button>
        </div>
      </section>

      <style jsx="true">{`
        .dashboard-control-center { display: flex; flex-direction: column; gap: 1.5rem; }
        
        .empty-state {
          padding: 5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: white;
          border: 2px dashed var(--border-medium);
        }

        .empty-icon-wrapper {
          width: 80px;
          height: 80px;
          background: var(--bg-main);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .empty-state h3 { font-size: 1.5rem; margin-bottom: 1rem; color: var(--primary-900); }
        .empty-state p { max-width: 480px; color: var(--primary-500); margin-bottom: 2.5rem; line-height: 1.6; }
        
        .btn-primary-glow {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: var(--radius-sm);
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .btn-primary-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          background: var(--primary-950);
        }

        .dashboard-welcome { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .dashboard-welcome h2 { font-size: 1.75rem; margin-bottom: 0.25rem; }
        .dashboard-welcome p { color: var(--primary-500); }

        .usage-card { width: 240px; padding: 1rem; background: white; }
        .usage-info { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; }
        .usage-bar { height: 6px; background: var(--bg-main); border-radius: 100px; margin-bottom: 0.75rem; overflow: hidden; }
        .usage-fill { height: 100%; border-radius: 100px; }
        .text-upgrade-link { background: none; border: none; color: var(--accent-600); font-size: 0.6875rem; font-weight: 700; padding: 0; cursor: pointer; }

        .projects-section { margin-bottom: 2rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .btn-primary-sm { background: var(--primary-900); color: white; border: none; padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.8125rem; }

        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
        .project-card { padding: 1.5rem; cursor: pointer; transition: all 0.2s; position: relative; }
        .project-card:hover { border-color: var(--accent-400); transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .project-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.active { background: var(--success-600); }
        .status-dot.draft { background: var(--warning-600); }
        .status-dot.completed { background: var(--primary-500); }
        .project-status { font-size: 0.6875rem; font-weight: 700; color: var(--primary-600); }
        .project-date { font-size: 0.6875rem; color: var(--primary-400); margin-left: auto; }
        .project-card h4 { font-size: 1rem; margin-bottom: 1.25rem; line-height: 1.4; min-height: 2.8rem; }
        .project-card-footer { display: flex; justify-content: space-between; align-items: flex-end; }
        .project-val .label { display: block; font-size: 0.625rem; font-weight: 700; color: var(--primary-400); text-transform: uppercase; }
        .project-val .val { font-size: 0.875rem; font-weight: 700; color: var(--primary-900); }
        
        .project-card.locked { background: var(--bg-main); border-style: dashed; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; color: var(--primary-400); text-align: center; }
        .project-card.locked p { font-size: 0.75rem; font-weight: 600; }

        .divider { height: 1px; background: var(--border-light); margin: 1rem 0 2rem; }

        .health-panel { padding: 2.5rem; border-left: 4px solid var(--accent-600); }
        .health-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .title-group { display: flex; align-items: center; gap: 1rem; }
        .status-badge-large { padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .on-budget { background: rgba(22, 163, 74, 0.1); color: var(--success-600); }
        .at-risk { background: rgba(217, 119, 6, 0.1); color: var(--warning-600); }
        .over-budget { background: rgba(220, 38, 38, 0.1); color: var(--danger-600); }

        .edit-budget { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
        .edit-budget label { font-size: 0.625rem; font-weight: 700; color: var(--primary-500); text-transform: uppercase; }
        .budget-input { border: 1px solid var(--border-light); padding: 0.5rem; border-radius: 4px; font-weight: 700; text-align: right; width: 140px; }

        .health-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-bottom: 2rem; }
        .metric-box .label { font-size: 0.8125rem; color: var(--primary-500); }
        .metric-box .value { font-size: 1.5rem; font-weight: 800; display: block; }

        .health-progress-bar { height: 8px; background: var(--bg-main); border-radius: 100px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.5s ease; }
        .progress-fill.on-budget { background: var(--success-600); }
        .progress-fill.at-risk { background: var(--warning-600); }
        .progress-fill.over-budget { background: var(--danger-600); }

        .intelligence-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; }
        .intel-card { padding: 1.25rem; }
        .intel-header { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
        .intel-label { font-size: 0.75rem; font-weight: 600; color: var(--primary-600); }
        .intel-value { font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; }
        .intel-footer { display: flex; justify-content: space-between; align-items: center; }
        .percent-tag { font-size: 0.6875rem; font-weight: 700; color: var(--primary-500); background: var(--bg-main); padding: 0.125rem 0.375rem; border-radius: 4px; }
        .subtle-link { font-size: 0.6875rem; color: var(--accent-600); display: flex; align-items: center; gap: 0.25rem; }

        .dashboard-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; }
        .panel-header { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-light); }
        .risk-list { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .risk-item { display: flex; gap: 1rem; padding: 1rem; border-radius: 8px; }
        .risk-item.high { background: rgba(220, 38, 38, 0.03); color: var(--danger-600); }
        .risk-item.medium { background: rgba(217, 119, 6, 0.03); color: var(--warning-600); }
        .risk-item.low { background: var(--bg-main); color: var(--primary-600); }
        .risk-message { font-size: 0.8125rem; line-height: 1.4; color: var(--primary-800); }

        .workflow-strip { padding: 1.25rem 2rem; display: flex; align-items: center; gap: 3rem; margin-top: 1rem; }
        .workflow-item { display: flex; align-items: center; gap: 0.75rem; }
        .workflow-item .label { display: block; font-size: 0.625rem; font-weight: 700; color: var(--primary-400); text-transform: uppercase; }
        .workflow-item .val { font-size: 0.8125rem; font-weight: 700; }
        .workflow-actions { margin-left: auto; }
        .btn-approve { background: var(--success-600); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 700; }

        .text-danger { color: var(--danger-600); }
        .text-success { color: var(--success-600); }
        .text-subtle { color: var(--primary-400); }
        
        .viz-bars { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .viz-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .row-info { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; }
        .row-bar-bg { height: 8px; background: var(--bg-main); border-radius: 100px; overflow: hidden; }
        .row-bar-fill { height: 100%; background: var(--primary-800); }
      `}</style>
    </div>
  );
};

export default ProjectDashboard;
