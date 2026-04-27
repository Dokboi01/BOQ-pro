import React from 'react';
import {
  Shield,
  ArrowRight,
  Sparkles,
  Calculator,
  FileSpreadsheet,
  MessagesSquare,
  HardHat,
  MapPin,
  CheckCircle2,
  Layers3,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Moon,
  SunMedium
} from 'lucide-react';

const Hero = ({ onGetStarted, onLogin, resolvedTheme, onToggleTheme }) => {
  const headlineStats = [
    { value: '24 hrs', label: 'Typical tender turnaround' },
    { value: '1 workspace', label: 'Pricing, notes, reports, and handoff' },
    { value: 'Region-aware', label: 'Lagos, Abuja, PH, Ibadan, Kano' }
  ];

  const capabilityCards = [
    {
      icon: <Calculator size={18} />,
      title: 'Custom Pricing That Feels Defendable',
      copy: 'Build rates from materials, labour, plant, transport, overheads, and profit instead of guessing a final number.'
    },
    {
      icon: <MessagesSquare size={18} />,
      title: 'One Workspace For The Team',
      copy: 'Keep pricing decisions, job notes, and follow-up tasks around the same BOQ so nothing gets lost in WhatsApp threads.'
    },
    {
      icon: <FileSpreadsheet size={18} />,
      title: 'Exports Ready For Real Submission',
      copy: 'Move from internal pricing to PDF and Excel outputs without rebuilding the job in another tool.'
    }
  ];

  const workflowSteps = [
    'Create or import the project structure',
    'Measure quantities and choose benchmark or custom pricing',
    'Review commercial allowances and internal notes',
    'Export client-ready BOQ schedules and reports'
  ];

  const operatingLanes = [
    {
      icon: <Building2 size={18} />,
      title: 'Company Dashboard',
      copy: 'See which jobs are live, which teams are pricing, and which estimates are ready for review without chasing separate files.',
      points: ['Live job status and totals', 'Shared company workspace flow', 'Quick access to current commercial decisions']
    },
    {
      icon: <ClipboardCheck size={18} />,
      title: 'Estimator Workflow',
      copy: 'Move from measurement to defendable rate build-up with regional benchmarks and custom pricing in the same screen.',
      points: ['Benchmark or custom rate per item', 'Quantity takeoff tied to BOQ units', 'Saved rate basis and pricing notes']
    },
    {
      icon: <FileText size={18} />,
      title: 'Review And Handover',
      copy: 'Keep the final stretch clean with exports, review notes, and submission-ready schedules that still trace back to the working BOQ.',
      points: ['PDF and Excel outputs', 'Commercial review before handoff', 'One source of truth from draft to final']
    }
  ];

  const outcomeStrip = [
    { value: '1 source', label: 'No duplicate pricing sheets' },
    { value: 'Live rates', label: 'Benchmark and custom in one flow' },
    { value: 'Team-ready', label: 'Built for company rollout, not solo spreadsheets' }
  ];

  const trustSignals = [
    'Built for Quantity Surveyors',
    'Built for Contractors',
    'Built for Pre-con Teams',
    'Built for Company Rollout'
  ];

  const projectSnapshot = [
    { section: 'Substructure', items: 12, rate: 'NGN 22.8M', state: 'Aligned' },
    { section: 'Blockwork', items: 19, rate: 'NGN 14.6M', state: 'Custom' },
    { section: 'Roofing', items: 8, rate: 'NGN 9.4M', state: 'Benchmark' }
  ];

  const activityFeed = [
    'Custom pricing updated for backyard entrance gate',
    'Rates benchmarked against Lagos regional market',
    'BOQ export prepared for review'
  ];

  return (
    <div className="landing-shell">
      <div className="landing-atmosphere" />
      <div className="landing-grid" />

      <nav className="landing-nav">
        <button className="brand-mark" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="brand-icon">
            <Shield size={18} />
          </span>
          <span className="brand-copy">
            <strong>BOQ Pro</strong>
            <small>Commercial workspace for construction teams</small>
          </span>
        </button>

        <div className="nav-actions">
          <button className="theme-toggle-btn" onClick={onToggleTheme}>
            {resolvedTheme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="nav-link" onClick={onLogin}>Log in</button>
          <button className="nav-cta" onClick={onGetStarted}>Start free</button>
        </div>
      </nav>

      <main className="landing-main">
        <section className="hero-panel">
          <div className="hero-copy">
            <div className="hero-kicker">
              <Sparkles size={14} />
              BOQ workspace for estimators, QS teams, and contractors
            </div>

            <h1>
              From rough scope
              <span> to priced BOQ</span>
              without the usual chaos.
            </h1>

            <p className="hero-subtitle">
              BOQ Pro brings quantity takeoff, benchmark pricing, custom rate build-up, collaboration,
              and exports into one construction-focused workspace your team can actually use on live jobs.
            </p>

            <div className="hero-actions">
              <button className="hero-primary" onClick={onGetStarted}>
                Create company workspace
                <ArrowRight size={18} />
              </button>
              <button className="hero-secondary" onClick={onLogin}>
                Open existing account
              </button>
            </div>

            <div className="hero-stats">
              {headlineStats.map((stat) => (
                <div key={stat.label} className="hero-stat-card">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="trust-strip">
              {trustSignals.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="workspace-card workspace-main">
              <div className="workspace-header">
                <div>
                  <span className="workspace-tag">Live project view</span>
                  <h2>3 Bedroom Duplex, Lekki</h2>
                </div>
                <span className="workspace-status">
                  <MapPin size={14} />
                  Lagos
                </span>
              </div>

              <div className="workspace-badges">
                <span><Layers3 size={14} /> 7 Sections</span>
                <span><BarChart3 size={14} /> NGN 68.4M Estimate</span>
                <span><HardHat size={14} /> Team pricing active</span>
              </div>

              <div className="snapshot-table">
                {projectSnapshot.map((row) => (
                  <div key={row.section} className="snapshot-row">
                    <div>
                      <strong>{row.section}</strong>
                      <small>{row.items} priced items</small>
                    </div>
                    <div className="snapshot-meta">
                      <strong>{row.rate}</strong>
                      <span className={`state-pill state-${row.state.toLowerCase()}`}>{row.state}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="activity-card">
                <div className="activity-title">
                  <MessagesSquare size={15} />
                  Recent team activity
                </div>
                {activityFeed.map((item) => (
                  <div key={item} className="activity-row">
                    <CheckCircle2 size={14} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="workspace-card workspace-side">
              <span className="workspace-tag">Custom pricing studio</span>
              <h3>Rate build-up</h3>
              <div className="side-metric">
                <span>Direct cost</span>
                <strong>NGN 142,000</strong>
              </div>
              <div className="side-metric">
                <span>Commercial allowances</span>
                <strong>18%</strong>
              </div>
              <div className="side-metric">
                <span>Final custom rate</span>
                <strong>NGN 185,000</strong>
              </div>
              <button className="side-action" onClick={onGetStarted}>
                Try custom pricing flow
              </button>
            </div>
          </div>
        </section>

        <section className="capabilities-band">
          {capabilityCards.map(({ icon, title, copy }) => (
            <article key={title} className="capability-card">
              <div className="capability-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <section className="operating-system-section">
          <div className="section-heading">
            <span className="section-kicker">Inside the app</span>
            <h2>A base page that feels like the product you open next.</h2>
            <p>
              BOQ Pro is strongest when it looks less like a generic landing page and more like a
              serious commercial system for construction teams. This front page now shows that
              company workflow more clearly.
            </p>
          </div>

          <div className="operating-system-grid">
            {operatingLanes.map(({ icon, title, copy, points }) => (
              <article key={title} className="operating-card">
                <div className="operating-card-head">
                  <div className="capability-icon operating-icon">{icon}</div>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </div>

                <div className="operating-points">
                  {points.map((point) => (
                    <div key={point} className="operating-point">
                      <CheckCircle2 size={14} />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="outcome-strip">
            {outcomeStrip.map(({ value, label }) => (
              <div key={label} className="outcome-card">
                <TrendingUp size={16} />
                <div>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="workflow-section">
          <div className="section-heading">
            <span className="section-kicker">How it works</span>
            <h2>Built around how pricing teams actually move.</h2>
            <p>
              The app is designed to carry a job from early measurement to final review without making
              the team jump across multiple tools.
            </p>
          </div>

          <div className="workflow-grid">
            {workflowSteps.map((step, index) => (
              <div key={step} className="workflow-card">
                <span className="workflow-index">0{index + 1}</span>
                <p>{step}</p>
                <ChevronDivider />
              </div>
            ))}
          </div>
        </section>

        <section className="closing-cta">
          <div>
            <span className="section-kicker">Ready to test it?</span>
            <h2>Start with one company account and one real project.</h2>
            <p>
              Use BOQ Pro to price one job properly, pressure-test the workflow, and grow from there.
            </p>
          </div>
          <div className="closing-actions">
            <button className="hero-primary" onClick={onGetStarted}>
              Get started free
              <ArrowRight size={18} />
            </button>
            <button className="hero-secondary closing-login" onClick={onLogin}>
              Log in
            </button>
          </div>
        </section>
      </main>

      <div className="mobile-cta-dock">
        <button className="mobile-dock-btn mobile-dock-btn-secondary" onClick={onLogin}>
          Log in
        </button>
        <button className="mobile-dock-btn mobile-dock-btn-primary" onClick={onGetStarted}>
          Start free
        </button>
      </div>

      <style jsx="true">{`
        .landing-shell {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.09), transparent 28%),
            radial-gradient(circle at 90% 12%, rgba(5, 150, 105, 0.08), transparent 22%),
            linear-gradient(180deg, #ffffff 0%, #f0fdf4 52%, #ecfdf5 100%);
          color: var(--primary-900);
          font-family: var(--font-main);
        }

        .landing-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(52, 211, 153, 0.18), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(16, 185, 129, 0.12), transparent 18%);
          pointer-events: none;
        }

        .landing-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(203, 213, 225, 0.45) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.45) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.4), transparent 90%);
          pointer-events: none;
        }

        .landing-nav,
        .landing-main {
          position: relative;
          z-index: 2;
          width: min(1220px, calc(100% - 2rem));
          margin: 0 auto;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.4rem 0 1rem;
        }

        .brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 0.9rem;
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary-900), var(--accent-600));
          box-shadow: 0 18px 35px rgba(16, 185, 129, 0.24);
        }

        .brand-copy {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .brand-copy strong {
          font-size: 1.02rem;
          letter-spacing: 0.02em;
        }

        .brand-copy small {
          font-size: 0.72rem;
          color: var(--primary-500);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-link,
        .nav-cta,
        .hero-primary,
        .hero-secondary,
        .side-action {
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          font-family: inherit;
        }

        .nav-link {
          background: transparent;
          color: var(--primary-600);
          font-size: 0.9rem;
          font-weight: 700;
          padding: 0.65rem 0.85rem;
        }

        .nav-link:hover {
          color: var(--primary-900);
          transform: translateY(-1px);
        }

        .nav-cta {
          padding: 0.82rem 1.2rem;
          border-radius: 999px;
          background: var(--primary-900);
          color: white;
          font-size: 0.9rem;
          font-weight: 800;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
        }

        .nav-cta:hover,
        .hero-primary:hover,
        .side-action:hover {
          transform: translateY(-2px);
        }

        .landing-main {
          padding: 2rem 0 4rem;
        }

        .hero-panel {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
          gap: 2rem;
          align-items: center;
        }

        .hero-copy {
          padding: 2rem 0;
        }

        .hero-kicker,
        .section-kicker,
        .workspace-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hero-kicker {
          padding: 0.55rem 0.9rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.16);
          color: var(--accent-600);
          box-shadow: 0 8px 18px rgba(16, 185, 129, 0.08);
        }

        .hero-copy h1 {
          margin: 1.25rem 0 1.1rem;
          font-size: clamp(3rem, 7vw, 5.4rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
          color: var(--primary-950);
        }

        .hero-copy h1 span {
          display: block;
          color: var(--accent-600);
        }

        .hero-subtitle {
          max-width: 670px;
          margin: 0;
          color: var(--primary-600);
          font-size: 1.06rem;
          line-height: 1.78;
        }

        .hero-actions,
        .closing-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-top: 2rem;
        }

        .hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          padding: 1rem 1.35rem;
          border-radius: 18px;
          background: var(--primary-900);
          color: white;
          font-size: 0.96rem;
          font-weight: 800;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.14);
        }

        .hero-secondary {
          padding: 1rem 1.25rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-medium);
          color: var(--primary-700);
          font-size: 0.95rem;
          font-weight: 700;
          box-shadow: var(--shadow-sm);
        }

        .hero-secondary:hover {
          background: var(--primary-50);
          border-color: var(--primary-400);
          transform: translateY(-2px);
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 2rem;
        }

        .hero-stat-card {
          padding: 1rem 1.05rem;
          border-radius: 20px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .hero-stat-card strong {
          display: block;
          color: var(--primary-900);
          font-size: 1rem;
          font-weight: 800;
        }

        .hero-stat-card span {
          display: block;
          margin-top: 0.3rem;
          color: var(--primary-500);
          font-size: 0.78rem;
          line-height: 1.5;
        }

        .trust-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 1.3rem;
        }

        .trust-strip span {
          padding: 0.46rem 0.72rem;
          border-radius: 999px;
          background: white;
          border: 1px solid var(--border-light);
          color: var(--primary-700);
          font-size: 0.74rem;
          font-weight: 700;
          box-shadow: var(--shadow-sm);
        }

        .hero-visual {
          position: relative;
          min-height: 640px;
        }

        .workspace-card {
          border-radius: 28px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(14px);
          box-shadow: var(--shadow-xl);
        }

        .workspace-main {
          padding: 1.4rem;
        }

        .workspace-side {
          position: absolute;
          right: -0.5rem;
          bottom: 1.2rem;
          width: min(280px, 82%);
          padding: 1.1rem 1rem;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.12);
        }

        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .workspace-tag {
          padding: 0.42rem 0.72rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.14);
          color: var(--accent-600);
        }

        .workspace-header h2,
        .workspace-side h3 {
          margin: 0.6rem 0 0;
          font-size: 1.2rem;
          line-height: 1.25;
          color: var(--primary-950);
        }

        .workspace-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.55rem 0.75rem;
          border-radius: 14px;
          background: rgba(217, 119, 6, 0.1);
          color: var(--warning-600);
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .workspace-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 1.1rem;
        }

        .workspace-badges span {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 0.75rem;
          border-radius: 14px;
          background: var(--primary-50);
          color: var(--primary-700);
          font-size: 0.76rem;
          font-weight: 700;
          border: 1px solid var(--border-light);
        }

        .snapshot-table {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1.2rem;
        }

        .snapshot-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-light);
        }

        .snapshot-row strong {
          display: block;
          font-size: 0.92rem;
          color: var(--primary-900);
        }

        .snapshot-row small {
          display: block;
          margin-top: 0.2rem;
          color: var(--primary-500);
          font-size: 0.72rem;
        }

        .snapshot-meta {
          text-align: right;
        }

        .state-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.35rem;
          padding: 0.36rem 0.6rem;
          border-radius: 999px;
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .state-aligned {
          background: rgba(34, 197, 94, 0.16);
          color: #86efac;
        }

        .state-custom {
          background: rgba(14, 165, 233, 0.16);
          color: #7dd3fc;
        }

        .state-benchmark {
          background: rgba(245, 158, 11, 0.16);
          color: #fcd34d;
        }

        .activity-card {
          margin-top: 1.2rem;
          padding: 1rem;
          border-radius: 22px;
          background: var(--primary-50);
          border: 1px solid var(--border-light);
        }

        .activity-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--primary-900);
          font-size: 0.83rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
        }

        .activity-row {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          color: var(--primary-600);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .activity-row + .activity-row {
          margin-top: 0.65rem;
        }

        .activity-row svg {
          margin-top: 0.18rem;
          flex-shrink: 0;
          color: var(--accent-600);
        }

        .side-metric {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }

        .side-metric:last-of-type {
          border-bottom: none;
        }

        .side-metric span {
          color: var(--primary-500);
          font-size: 0.76rem;
        }

        .side-metric strong {
          text-align: right;
          font-size: 0.84rem;
          color: var(--primary-900);
        }

        .side-action {
          width: 100%;
          margin-top: 1rem;
          padding: 0.85rem 0.95rem;
          border-radius: 14px;
          background: var(--accent-600);
          color: white;
          font-size: 0.84rem;
          font-weight: 800;
        }

        .capabilities-band {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 2.5rem;
        }

        .capability-card {
          padding: 1.35rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .capability-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }

        .capability-card h3 {
          margin: 1rem 0 0.5rem;
          font-size: 1rem;
        }

        .capability-card p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.65;
        }

        .operating-system-section {
          margin-top: 3rem;
        }

        .operating-system-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1.4rem;
        }

        .operating-card {
          padding: 1.35rem;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .operating-card-head {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1rem;
          align-items: flex-start;
        }

        .operating-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
        }

        .operating-card h3 {
          margin: 0 0 0.45rem;
          font-size: 1rem;
          color: var(--primary-950);
        }

        .operating-card p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.7;
        }

        .operating-points {
          display: grid;
          gap: 0.7rem;
          margin-top: 1.15rem;
        }

        .operating-point {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          padding: 0.8rem 0.9rem;
          border-radius: 16px;
          background: var(--primary-50);
          border: 1px solid rgba(203, 213, 225, 0.65);
          color: var(--primary-700);
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .operating-point svg {
          flex-shrink: 0;
          margin-top: 0.1rem;
          color: var(--accent-600);
        }

        .outcome-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 1rem;
        }

        .outcome-card {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 1rem 1.1rem;
          border-radius: 20px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .outcome-card svg {
          color: var(--accent-600);
          flex-shrink: 0;
        }

        .outcome-card strong {
          display: block;
          color: var(--primary-900);
          font-size: 0.92rem;
          font-weight: 800;
        }

        .outcome-card span {
          display: block;
          margin-top: 0.2rem;
          color: var(--primary-500);
          font-size: 0.76rem;
          line-height: 1.45;
        }

        .workflow-section {
          margin-top: 3.5rem;
          padding: 2rem 0 0;
        }

        .section-heading {
          max-width: 760px;
        }

        .section-kicker {
          padding: 0.45rem 0.72rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.14);
          color: var(--accent-600);
        }

        .section-heading h2,
        .closing-cta h2 {
          margin: 1rem 0 0.7rem;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .section-heading p,
        .closing-cta p {
          margin: 0;
          max-width: 720px;
          color: var(--primary-600);
          line-height: 1.75;
        }

        .workflow-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 1.4rem;
        }

        .workflow-card {
          position: relative;
          min-height: 210px;
          padding: 1.2rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .workflow-index {
          display: inline-flex;
          margin-bottom: 1.2rem;
          color: var(--accent-600);
          font-size: 1.65rem;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .workflow-card p {
          margin: 0;
          max-width: 220px;
          color: var(--primary-700);
          font-size: 0.95rem;
          line-height: 1.65;
        }

        .closing-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          margin: 3.6rem 0 1rem;
          padding: 1.6rem;
          border-radius: 30px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(255, 255, 255, 0.95));
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-md);
        }

        .closing-login {
          min-width: 120px;
        }

        .mobile-cta-dock {
          display: none;
        }

        @media (max-width: 1080px) {
          .hero-panel,
          .capabilities-band,
          .operating-system-grid,
          .outcome-strip,
          .workflow-grid,
          .closing-cta {
            grid-template-columns: 1fr;
          }

          .hero-panel {
            display: flex;
            flex-direction: column;
          }

          .hero-visual {
            width: 100%;
            min-height: auto;
          }

          .workspace-side {
            position: static;
            width: 100%;
            margin-top: 1rem;
          }

          .capabilities-band,
          .operating-system-grid,
          .workflow-grid {
            display: grid;
          }

          .closing-cta {
            display: grid;
          }
        }

        @media (max-width: 820px) {
          .landing-nav {
            gap: 1rem;
            align-items: flex-start;
            flex-direction: column;
          }

          .hero-copy h1 {
            font-size: clamp(2.7rem, 13vw, 4.1rem);
          }

          .hero-stats {
            grid-template-columns: 1fr;
          }

          .capabilities-band,
          .operating-system-grid,
          .outcome-strip,
          .workflow-grid {
            grid-template-columns: 1fr;
          }

          .workflow-card {
            min-height: auto;
          }
        }

        @media (max-width: 640px) {
          .landing-nav,
          .landing-main {
            width: min(1220px, calc(100% - 1.25rem));
          }

          .landing-nav {
            position: sticky;
            top: 0;
            z-index: 20;
            padding: 0.9rem 0 0.8rem;
            background: rgba(248, 250, 252, 0.92);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid rgba(203, 213, 225, 0.7);
          }

          .landing-main {
            padding-top: 1rem;
            padding-bottom: 7rem;
          }

          .brand-copy small {
            display: none;
          }

          .nav-actions {
            display: none;
          }

          .hero-actions,
          .closing-actions {
            width: 100%;
          }

          .hero-panel {
            gap: 1.25rem;
          }

          .hero-copy {
            padding: 0.5rem 0 0;
          }

          .hero-kicker {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .hero-primary,
          .hero-secondary,
          .side-action {
            width: 100%;
            justify-content: center;
          }

          .hero-copy h1 {
            font-size: clamp(2.35rem, 12vw, 3rem);
            line-height: 1.02;
          }

          .hero-subtitle {
            font-size: 0.95rem;
            line-height: 1.7;
          }

          .hero-stats,
          .trust-strip,
          .workspace-badges,
          .outcome-strip {
            display: flex;
            overflow-x: auto;
            gap: 0.75rem;
            padding-bottom: 0.2rem;
            scroll-snap-type: x proximity;
          }

          .hero-stat-card,
          .trust-strip span,
          .workspace-badges span,
          .outcome-card {
            flex: 0 0 auto;
            scroll-snap-align: start;
          }

          .hero-stat-card {
            min-width: 210px;
          }

          .trust-strip span {
            white-space: nowrap;
          }

          .workspace-main,
          .workspace-side,
          .capability-card,
          .operating-card,
          .closing-cta {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .workspace-main {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }

          .workspace-side {
            margin-top: 0.75rem;
            border-radius: 22px;
          }

          .workspace-header,
          .snapshot-row,
          .closing-cta {
            flex-direction: column;
            align-items: flex-start;
          }

          .snapshot-row:nth-child(n + 3) {
            display: none;
          }

          .snapshot-meta {
            width: 100%;
            text-align: left;
          }

          .activity-card {
            display: none;
          }

          .capabilities-band,
          .workflow-grid {
            gap: 0.85rem;
          }

          .capability-card,
          .operating-card,
          .workflow-card {
            border-radius: 20px;
          }

          .operating-card-head {
            grid-template-columns: 1fr;
          }

          .outcome-card {
            min-width: 230px;
          }

          .workflow-card {
            padding: 1rem;
          }

          .closing-cta {
            margin-bottom: 0;
          }

          .mobile-cta-dock {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 30;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            padding: 0.8rem 0.9rem calc(0.8rem + env(safe-area-inset-bottom, 0px));
            background: rgba(248, 250, 252, 0.96);
            backdrop-filter: blur(16px);
            border-top: 1px solid rgba(203, 213, 225, 0.8);
            box-shadow: 0 -10px 24px rgba(15, 23, 42, 0.08);
          }

          .mobile-dock-btn {
            min-height: 48px;
            border-radius: 14px;
            font-size: 0.9rem;
            font-weight: 800;
            border: 1px solid transparent;
          }

          .mobile-dock-btn-secondary {
            background: white;
            color: var(--primary-700);
            border-color: var(--border-medium);
          }

          .mobile-dock-btn-primary {
            background: var(--primary-900);
            color: white;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);
          }
        }
      `}</style>
    </div>
  );
};

const ChevronDivider = () => (
  <div
    style={{
      width: '100%',
      height: '1px',
      marginTop: '1.4rem',
      background: 'linear-gradient(90deg, rgba(148,163,184,0.24), rgba(148,163,184,0.04))'
    }}
  />
);

export default Hero;
