import React, { useMemo, useState } from 'react';
import { useToast } from '../ui/useToast';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Lock,
  Search,
  ShieldAlert,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import { PLAN_LIMITS, PLAN_NAMES } from '../../data/plans';
import { getProjectPricingAnalytics } from '../../utils/pricing';

const MONEY = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const formatMoney = (value) => `₦${MONEY.format(Number(value) || 0)}`;

const formatProjectDate = (value) => {
  if (!value) return 'Recently updated';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const toneForStatus = (status = '') => {
  const value = status.toLowerCase();
  if (value.includes('complete')) return 'completed';
  if (value.includes('draft')) return 'draft';
  return 'active';
};

const riskIconForLevel = (level) => {
  if (level === 'high') return ShieldAlert;
  if (level === 'medium') return AlertCircle;
  return CheckCircle2;
};

const ProjectDashboard = ({ user, projects = [], onCreateProject, onSelectProject, onDeleteProject, onUpgrade }) => {
  const [budget, setBudget] = useState(250000000);
  const [activeVizTab, setActiveVizTab] = useState('section');
  const [isApproved, setIsApproved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const toast = useToast();

  const projectEntries = useMemo(() => (
    projects.map((project) => ({
      project,
      analytics: getProjectPricingAnalytics(project)
    }))
  ), [projects]);

  const activeEntry = projectEntries[0] || null;
  const activeProject = activeEntry?.project || null;
  const activeAnalytics = activeEntry?.analytics || null;

  const currentTotal = activeAnalytics?.totalValue || 0;
  const commercialReadiness = activeAnalytics
    ? Math.min((activeAnalytics.pricingCoveragePercent + activeAnalytics.confidenceScore) / 2, 100)
    : 0;
  const status = currentTotal === 0 ? 'No Data'
    : currentTotal > budget ? 'Over Budget'
      : currentTotal > budget * 0.95 ? 'At Risk'
        : 'On Budget';

  const pricingStage = !activeAnalytics || activeAnalytics.totalItems === 0
    ? 'Scope Setup'
    : activeAnalytics.pricingCoveragePercent < 40
      ? 'Initial Pricing'
      : activeAnalytics.pricingCoveragePercent < 85
        ? 'Rate Build-Up'
        : activeAnalytics.outlierCount > 0
          ? 'Commercial Review'
          : 'Tender Ready';

  const limits = PLAN_LIMITS[user?.plan] || PLAN_LIMITS[PLAN_NAMES.FREE];
  const isLimitReached = projects.length >= limits.maxProjects;

  const filteredProjects = useMemo(() => {
    const result = projectEntries.filter(({ project }) => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'All' || project.type === filterType;
      return matchesSearch && matchesType;
    });

    if (sortBy === 'oldest') return [...result].reverse();
    if (sortBy === 'value-high') return [...result].sort((a, b) => b.analytics.totalValue - a.analytics.totalValue);
    if (sortBy === 'value-low') return [...result].sort((a, b) => a.analytics.totalValue - b.analytics.totalValue);
    return result;
  }, [filterType, projectEntries, searchQuery, sortBy]);

  const portfolioValue = projectEntries.reduce((sum, entry) => sum + entry.analytics.totalValue, 0);
  const portfolioItems = projectEntries.reduce((sum, entry) => sum + entry.analytics.totalItems, 0);
  const portfolioBenchmarkItems = projectEntries.reduce((sum, entry) => sum + entry.analytics.benchmarkItems, 0);
  const portfolioOutliers = projectEntries.reduce((sum, entry) => sum + entry.analytics.outlierCount, 0);

  const analyticsCards = [
    {
      label: 'Estimated Cost',
      value: activeAnalytics ? formatMoney(currentTotal) : formatMoney(0),
      detail: activeProject ? `${activeProject.name} live BOQ total` : 'Open a project to see live BOQ totals',
      icon: BarChart3
    },
    {
      label: 'Sections',
      value: activeAnalytics ? activeAnalytics.totalSections : 0,
      detail: activeAnalytics ? `${activeAnalytics.totalItems} items across the current BOQ` : 'No active project',
      icon: Layers
    },
    {
      label: 'Pricing Coverage',
      value: activeAnalytics ? `${PERCENT.format(activeAnalytics.pricingCoveragePercent)}%` : '0%',
      detail: activeAnalytics ? `${activeAnalytics.pricedItems}/${activeAnalytics.totalItems} items priced` : 'No active project',
      icon: Target
    },
    {
      label: 'Pricing Confidence',
      value: activeAnalytics ? `${Math.round(activeAnalytics.confidenceScore)}/100` : '0/100',
      detail: activeAnalytics ? `${activeAnalytics.outlierCount} drift flag${activeAnalytics.outlierCount === 1 ? '' : 's'}` : 'Waiting for pricing data',
      icon: CheckCircle2
    },
    {
      label: 'Market Tracking',
      value: activeAnalytics ? `${PERCENT.format(activeAnalytics.benchmarkCoveragePercent)}%` : '0%',
      detail: activeAnalytics ? `${activeAnalytics.benchmarkItems} benchmark-priced · ${activeAnalytics.outlierCount} drift flag${activeAnalytics.outlierCount === 1 ? '' : 's'}` : 'Benchmark coverage appears here',
      icon: Users
    }
  ];

  const pipelineStages = [
    { label: 'Scope Setup', status: activeAnalytics?.totalItems > 0 ? 'completed' : 'active' },
    { label: 'Rate Build-Up', status: !activeAnalytics || activeAnalytics.totalItems === 0 ? 'upcoming' : activeAnalytics.pricingCoveragePercent >= 85 ? 'completed' : 'active' },
    { label: 'Commercial Review', status: !activeAnalytics || activeAnalytics.pricingCoveragePercent < 60 ? 'upcoming' : activeAnalytics.outlierCount > 0 || activeAnalytics.unpricedItems > 0 ? 'active' : 'completed' },
    { label: 'Tender Handover', status: activeAnalytics && activeAnalytics.pricingCoveragePercent >= 100 && activeAnalytics.outlierCount === 0 ? 'active' : 'upcoming' }
  ];

  const costBreakdown = activeAnalytics?.compositionRows.slice(0, 4).map((row) => ({
    label: row.label,
    amount: row.amount,
    percent: Math.round(row.percent),
    trend: row.percent >= 40 ? 'up' : row.percent >= 18 ? 'stable' : 'down'
  })) || [];

  const chartRows = activeVizTab === 'section'
    ? (activeAnalytics?.sectionSummaries || []).slice(0, 5).map((section) => ({
      label: section.title,
      percent: section.percentOfTotal,
      helper: `${section.itemCount} item${section.itemCount === 1 ? '' : 's'}`
    }))
    : (activeAnalytics?.topDrivers || []).slice(0, 5).map((driver) => ({
      label: `${driver.description} (${driver.section})`,
      percent: driver.percentOfTotal,
      helper: formatMoney(driver.total)
    }));

  const riskFlags = activeAnalytics?.riskFlags || [];
  const usagePercent = Math.min((projects.length / limits.maxProjects) * 100, 100);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h2>Good Afternoon, {user?.full_name || 'Practitioner'}</h2>
          <p>You have <strong>{projects.length} active projects</strong> in your commercial workspace.</p>
        </div>
        {user?.plan === PLAN_NAMES.FREE && (
          <div className="usage-card">
            <div className="usage-row">
              <span>Project Limit</span>
              <span>{projects.length} / {limits.maxProjects}</span>
            </div>
            <div className="usage-track"><div className="usage-fill" style={{ width: `${usagePercent}%` }} /></div>
            <button className="usage-link" onClick={onUpgrade}>Upgrade to unlock more projects</button>
          </div>
        )}
      </header>

      <section className="stats-grid">
        {analyticsCards.map((card) => (
          <article key={card.label} className="stat-card enterprise-card">
            <div className="stat-icon"><card.icon size={18} /></div>
            <div>
              <span className="eyebrow">{card.label}</span>
              <strong className="stat-value">{card.value}</strong>
              <p className="muted">{card.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="pipeline enterprise-card">
        <div className="row-head">
          <div>
            <h3>Project Execution Roadmap</h3>
            <p>Live stage tracking for the active pricing workflow</p>
          </div>
          <span className="badge">{pricingStage}</span>
        </div>
        <div className="pipeline-grid">
          {pipelineStages.map((stage) => (
            <div key={stage.label} className={`stage-card ${stage.status}`}>
              <div className="stage-dot">{stage.status === 'completed' ? <CheckCircle2 size={14} /> : stage.label.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{stage.label}</strong>
                <span>{stage.status.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="portfolio-grid">
        <article className="mini-card enterprise-card"><BarChart3 size={18} /><div><span className="eyebrow">Portfolio Value</span><strong>{formatMoney(portfolioValue)}</strong></div></article>
        <article className="mini-card enterprise-card"><Layers size={18} /><div><span className="eyebrow">Portfolio Items</span><strong>{portfolioItems}</strong></div></article>
        <article className="mini-card enterprise-card"><Target size={18} /><div><span className="eyebrow">Benchmark-Priced</span><strong>{portfolioBenchmarkItems}</strong></div></article>
        <article className="mini-card enterprise-card"><AlertCircle size={18} /><div><span className="eyebrow">Open Drift Flags</span><strong>{portfolioOutliers}</strong></div></article>
      </section>

      <section className="projects-panel">
        <div className="row-head">
          <div>
            <h3>My Projects</h3>
            <p>Select a live project to continue pricing or commercial review</p>
          </div>
          <div className="controls">
            <label className="search-bar">
              <Search size={16} />
              <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="control">
              <option value="All">All Types</option>
              <option value="Building">Building</option>
              <option value="Road">Road</option>
              <option value="Drainage">Drainage</option>
              <option value="Foundation">Foundation</option>
              <option value="Coastal / Marine">Coastal</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="control">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="value-high">Highest Value</option>
              <option value="value-low">Lowest Value</option>
            </select>
            {projects.length > 0 && <button className="primary-btn" onClick={onCreateProject} disabled={isLimitReached}>{isLimitReached ? 'Limit Reached' : '+ New Project'}</button>}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-card enterprise-card">
            <div className="empty-icon"><Layers size={44} /></div>
            <h3>No projects yet</h3>
            <p>Start a project to unlock realistic pricing coverage, benchmark tracking, and company-ready BOQ visibility.</p>
            <button className="primary-btn" onClick={onCreateProject}><ArrowUpRight size={16} /> Create Your First Project</button>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map(({ project, analytics }) => {
              const canDeleteProject = project.isOwner === true
                || project.user_id === user?.id
                || String(project.id || '').startsWith('local_');

              return (
              <article key={project.id} className="project-card enterprise-card" onClick={() => onSelectProject(project.id)}>
                <div className="project-top">
                  <span className={`status-dot ${toneForStatus(project.status)}`} />
                  <span className="project-status">{project.status}</span>
                  <span className="muted">{formatProjectDate(project.date || project.updatedAt || project.updated_at)}</span>
                </div>
                <h4>{project.name}</h4>
                <p className="muted">{project.type} · {analytics.totalItems} items · {analytics.totalSections} sections</p>
                <div className="project-metrics">
                  <div><span className="eyebrow">Est. Cost</span><strong>{formatMoney(analytics.totalValue)}</strong></div>
                  <div><span className="eyebrow">Coverage</span><strong>{PERCENT.format(analytics.pricingCoveragePercent)}%</strong></div>
                </div>
                <div className="project-foot">
                  <div className="pill-row">
                    <span className="pill">{analytics.benchmarkItems} benchmark</span>
                    <span className="pill">{analytics.customItems} custom override</span>
                  </div>
                  <div className="action-row">
                    {canDeleteProject && (
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${project.name}"?`)) onDeleteProject(project.id);
                        }}
                        title="Delete Project"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronRight size={18} />
                  </div>
                </div>
              </article>
            )})}
            {user?.plan === PLAN_NAMES.FREE && projects.length < limits.maxProjects && (
              <article className="project-card locked enterprise-card" onClick={onCreateProject}>
                <Lock size={24} />
                <p>Available project slot</p>
              </article>
            )}
          </div>
        )}
      </section>

      {activeProject && activeAnalytics && (
        <>
          <section className="health-panel enterprise-card">
            <div className="row-head">
              <div>
                <h3>{activeProject.name}</h3>
                <span className={`status-chip ${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>
              </div>
              <div className="budget-box">
                <label>Approved Budget (₦)</label>
                <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="control" />
              </div>
            </div>
            <div className="metric-grid">
              <article className="metric-card"><span className="eyebrow">Estimated Cost</span><strong>{formatMoney(currentTotal)}</strong><p className="muted">Live BOQ total</p></article>
              <article className="metric-card"><span className="eyebrow">Sections</span><strong>{activeAnalytics.totalSections}</strong><p className="muted">{activeAnalytics.totalItems} items in current scope</p></article>
              <article className="metric-card"><span className="eyebrow">Pricing Coverage</span><strong>{PERCENT.format(activeAnalytics.pricingCoveragePercent)}%</strong><p className="muted">{activeAnalytics.unpricedItems} items still open</p></article>
              <article className="metric-card"><span className="eyebrow">Pricing Confidence</span><strong>{Math.round(activeAnalytics.confidenceScore)}/100</strong><p className="muted">{activeAnalytics.outlierCount} drift flag{activeAnalytics.outlierCount === 1 ? '' : 's'}</p></article>
              <article className="metric-card"><span className="eyebrow">Market Tracking</span><strong>{PERCENT.format(activeAnalytics.benchmarkCoveragePercent)}%</strong><p className="muted">{activeAnalytics.benchmarkItems} benchmark-priced · {activeAnalytics.customItems} custom override</p></article>
            </div>
            <div className="meter-grid">
              <div className="meter-card">
                <div className="meter-copy"><span>Budget Use</span><strong>{PERCENT.format(Math.min((currentTotal / Math.max(budget, 1)) * 100, 100))}%</strong></div>
                <div className="meter-track"><div className={`meter-fill ${status.toLowerCase().replace(/\s+/g, '-')}`} style={{ width: `${Math.min((currentTotal / Math.max(budget, 1)) * 100, 100)}%` }} /></div>
              </div>
              <div className="meter-card">
                <div className="meter-copy"><span>Commercial Readiness</span><strong>{PERCENT.format(commercialReadiness)}%</strong></div>
                <div className="meter-track"><div className="meter-fill readiness" style={{ width: `${commercialReadiness}%` }} /></div>
              </div>
            </div>
          </section>

          <section className="intel-grid">
            {costBreakdown.map((item) => (
              <article key={item.label} className="intel-card enterprise-card">
                <div className="intel-head">
                  <span className="eyebrow">{item.label}</span>
                  {item.trend === 'up' && <TrendingUp size={16} className="danger" />}
                  {item.trend === 'down' && <TrendingDown size={16} className="success" />}
                  {item.trend === 'stable' && <Clock size={16} className="muted-icon" />}
                </div>
                <strong>{formatMoney(item.amount)}</strong>
                <p className="muted">{item.percent}% of contract sum</p>
              </article>
            ))}
          </section>

          <div className="split-grid">
            <section className="enterprise-card panel-card">
              <div className="row-head">
                <div>
                  <h3>Cost Distribution</h3>
                  <p>{activeAnalytics.dominantSection ? `${activeAnalytics.dominantSection.title} is the current commercial driver` : 'Add pricing data to unlock distribution insights'}</p>
                </div>
                <div className="tab-row">
                  <button className={`tab-btn ${activeVizTab === 'section' ? 'active' : ''}`} onClick={() => setActiveVizTab('section')}>By Section</button>
                  <button className={`tab-btn ${activeVizTab === 'drivers' ? 'active' : ''}`} onClick={() => setActiveVizTab('drivers')}>Top Drivers</button>
                </div>
              </div>
              <div className="chart-stack">
                {chartRows.length > 0 ? chartRows.map((row) => (
                  <div key={row.label} className="chart-row">
                    <div className="chart-labels"><span>{row.label}</span><span>{PERCENT.format(row.percent)}%</span></div>
                    <div className="muted">{row.helper}</div>
                    <div className="chart-track"><div className="chart-fill" style={{ width: `${Math.min(row.percent, 100)}%` }} /></div>
                  </div>
                )) : <p className="muted">No distribution data is available yet for this project.</p>}
              </div>
            </section>

            <section className="enterprise-card panel-card">
              <div className="row-head">
                <div>
                  <h3>Risk Flags</h3>
                  <p>Issues generated from live coverage and market drift</p>
                </div>
                <Target size={18} />
              </div>
              <div className="risk-list">
                {riskFlags.length > 0 ? riskFlags.map((risk, index) => {
                  const Icon = riskIconForLevel(risk.level);
                  return (
                    <article key={`${risk.level}-${index}`} className={`risk-card ${risk.level}`}>
                      <Icon size={18} />
                      <p>{risk.message}</p>
                    </article>
                  );
                }) : <article className="risk-card low"><CheckCircle2 size={18} /><p>No active commercial risks are showing yet.</p></article>}
              </div>
            </section>
          </div>

          <section className="workflow enterprise-card">
            <div className="workflow-item"><Layers size={18} /><div><span className="eyebrow">Current Stage</span><strong>{pricingStage}</strong></div></div>
            <div className="workflow-item"><Calendar size={18} /><div><span className="eyebrow">Last Modified</span><strong>{formatProjectDate(activeProject.date || activeProject.updatedAt || activeProject.updated_at)}</strong></div></div>
            <div className="workflow-item"><Users size={18} /><div><span className="eyebrow">Project Controller</span><strong>{user?.role || 'Professional User'}</strong></div></div>
            <button
              className={`primary-btn approve-btn ${isApproved ? 'approved' : ''}`}
              onClick={() => {
                if (confirm('Are you sure you want to approve this pricing review?')) {
                  setIsApproved(true);
                  toast.success('Pricing review approved successfully.');
                }
              }}
              disabled={isApproved}
            >
              {isApproved ? 'Review Approved' : 'Approve Pricing Review'}
            </button>
          </section>
        </>
      )}

      <style jsx="true">{`
        .dashboard-shell { display: flex; flex-direction: column; gap: 1.25rem; }
        .dashboard-header, .row-head, .workflow { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .dashboard-header h2, .row-head h3 { margin: 0 0 0.3rem; color: var(--primary-900); }
        .dashboard-header p, .row-head p, .muted { margin: 0; color: var(--primary-500); font-size: 0.8rem; }
        .enterprise-card { background: white; border: 1px solid var(--border-light); border-radius: 20px; box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05); }
        .usage-card, .pipeline, .health-panel, .panel-card { padding: 1.2rem; }
        .usage-row { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; }
        .usage-track, .meter-track, .chart-track { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
        .usage-fill, .meter-fill, .chart-fill { height: 100%; background: #2563eb; border-radius: 999px; }
        .usage-link { background: none; border: none; padding: 0; margin-top: 0.7rem; color: var(--accent-600); font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .stats-grid, .portfolio-grid, .metric-grid, .intel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
        .stat-card, .mini-card, .metric-card, .intel-card, .project-card, .empty-card, .stage-card, .risk-card { padding: 1rem; }
        .stat-card, .mini-card, .workflow-item { display: flex; gap: 0.8rem; align-items: center; }
        .stat-icon, .empty-icon, .stage-dot { width: 40px; height: 40px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: #eff6ff; color: var(--primary-900); flex-shrink: 0; }
        .empty-card { text-align: center; padding: 3.2rem 1.5rem; }
        .empty-icon { margin: 0 auto 1rem; width: 74px; height: 74px; border-radius: 50%; background: var(--bg-main); }
        .eyebrow { display: block; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--primary-500); }
        .stat-value, .metric-card strong, .intel-card strong, .mini-card strong, .project-card strong { display: block; color: var(--primary-900); }
        .badge, .pill, .status-chip { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 0.3rem 0.7rem; font-size: 0.72rem; font-weight: 800; }
        .badge { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
        .status-chip.on-budget { background: rgba(22, 163, 74, 0.12); color: var(--success-600); }
        .status-chip.at-risk { background: rgba(217, 119, 6, 0.12); color: var(--warning-600); }
        .status-chip.over-budget { background: rgba(220, 38, 38, 0.12); color: var(--danger-600); }
        .pipeline-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.8rem; }
        .stage-card { display: flex; gap: 0.75rem; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; }
        .stage-card.completed { background: #eff6ff; border-color: #bfdbfe; }
        .stage-card.active { background: #eef2ff; border-color: #c7d2fe; }
        .stage-card strong { display: block; color: var(--primary-800); }
        .stage-card span { font-size: 0.68rem; font-weight: 800; color: var(--primary-500); }
        .projects-panel { display: flex; flex-direction: column; gap: 1rem; }
        .controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .search-bar { display: flex; align-items: center; gap: 0.5rem; min-width: 240px; padding: 0.65rem 0.8rem; background: white; border: 1px solid var(--border-medium); border-radius: 12px; }
        .search-bar input { border: none; outline: none; background: transparent; width: 100%; font-size: 0.85rem; }
        .control, .primary-btn { border-radius: 12px; padding: 0.7rem 0.85rem; font-size: 0.82rem; }
        .control { border: 1px solid var(--border-medium); background: white; }
        .primary-btn { border: none; background: var(--primary-900); color: white; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; cursor: pointer; }
        .primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
        .project-card { cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .project-card:hover { transform: translateY(-2px); box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08); }
        .project-top, .project-foot, .project-metrics, .meter-copy, .chart-labels, .intel-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
        .project-top { margin-bottom: 0.7rem; }
        .project-card h4 { margin: 0 0 0.35rem; }
        .project-metrics { margin: 1rem 0; align-items: flex-start; }
        .project-foot { margin-top: 0.8rem; }
        .pill-row, .action-row, .tab-row { display: flex; align-items: center; gap: 0.45rem; }
        .pill { background: #f8fafc; color: var(--primary-600); font-size: 0.66rem; }
        .icon-btn { border: none; background: transparent; color: var(--primary-400); cursor: pointer; }
        .icon-btn:hover { color: var(--danger-600); }
        .locked { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--primary-400); text-align: center; border-style: dashed; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.active { background: var(--success-600); }
        .status-dot.draft { background: var(--warning-600); }
        .status-dot.completed { background: var(--primary-500); }
        .budget-box { display: flex; flex-direction: column; gap: 0.35rem; }
        .budget-box label { font-size: 0.68rem; font-weight: 800; color: var(--primary-500); text-transform: uppercase; }
        .meter-grid, .split-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; }
        .meter-card { padding: 0.95rem 1rem; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .meter-copy { margin-bottom: 0.6rem; font-size: 0.8rem; font-weight: 800; color: var(--primary-700); }
        .meter-fill.at-risk { background: var(--warning-600); }
        .meter-fill.over-budget { background: var(--danger-600); }
        .meter-fill.readiness { background: #2563eb; }
        .intel-head { margin-bottom: 0.5rem; }
        .panel-card { display: flex; flex-direction: column; gap: 1rem; }
        .tab-btn { border: 1px solid #dbe4ee; background: white; color: var(--primary-600); border-radius: 999px; padding: 0.45rem 0.7rem; font-size: 0.74rem; font-weight: 800; cursor: pointer; }
        .tab-btn.active { background: var(--primary-900); color: white; border-color: var(--primary-900); }
        .chart-stack, .risk-list { display: flex; flex-direction: column; gap: 0.8rem; }
        .chart-row { display: flex; flex-direction: column; gap: 0.35rem; }
        .chart-labels span:first-child { color: var(--primary-800); font-weight: 700; }
        .risk-card { display: flex; gap: 0.75rem; align-items: flex-start; border-radius: 16px; }
        .risk-card.high { background: rgba(220, 38, 38, 0.06); }
        .risk-card.medium { background: rgba(217, 119, 6, 0.07); }
        .risk-card.low { background: #f8fafc; }
        .risk-card p { margin: 0; font-size: 0.8rem; color: var(--primary-800); line-height: 1.5; }
        .workflow { padding: 1rem 1.2rem; align-items: center; }
        .workflow-item strong { color: var(--primary-900); }
        .approve-btn { margin-left: auto; }
        .approve-btn.approved { background: var(--primary-500); }
        .danger { color: var(--danger-600); }
        .success { color: var(--success-600); }
        .muted-icon { color: var(--primary-400); }
        @media (max-width: 980px) {
          .dashboard-header, .row-head, .workflow { flex-direction: column; align-items: flex-start; }
          .usage-card, .controls, .search-bar, .budget-box, .control, .primary-btn, .approve-btn { width: 100%; }
          .pipeline-grid, .meter-grid, .split-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .stats-grid, .portfolio-grid, .project-grid, .metric-grid, .intel-grid { grid-template-columns: 1fr; }
          .project-metrics, .project-foot { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default ProjectDashboard;
