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
  BarChart3
} from 'lucide-react';

const Hero = ({ onGetStarted, onLogin }) => {
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

      <style jsx="true">{`
        .landing-shell {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(214, 158, 46, 0.12), transparent 28%),
            radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.14), transparent 26%),
            linear-gradient(180deg, #071019 0%, #0b1724 44%, #101d2d 100%);
          color: #f8fafc;
          font-family: "Space Grotesk", "Segoe UI", "Trebuchet MS", sans-serif;
        }

        .landing-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 25%, rgba(56, 189, 248, 0.12), transparent 22%),
            radial-gradient(circle at 78% 76%, rgba(245, 158, 11, 0.1), transparent 20%);
          pointer-events: none;
        }

        .landing-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.82), transparent 88%);
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
          background: linear-gradient(135deg, #0f766e, #2563eb);
          box-shadow: 0 18px 35px rgba(37, 99, 235, 0.24);
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
          color: #93a7bd;
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
          color: #dbe7f5;
          font-size: 0.9rem;
          font-weight: 700;
          padding: 0.65rem 0.85rem;
        }

        .nav-link:hover {
          color: white;
          transform: translateY(-1px);
        }

        .nav-cta {
          padding: 0.82rem 1.2rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #09131d;
          font-size: 0.9rem;
          font-weight: 800;
          box-shadow: 0 16px 30px rgba(217, 119, 6, 0.28);
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
          background: rgba(12, 21, 33, 0.64);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #9dc4ff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .hero-copy h1 {
          margin: 1.25rem 0 1.1rem;
          font-size: clamp(3rem, 7vw, 5.4rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
        }

        .hero-copy h1 span {
          display: block;
          color: #f6b951;
        }

        .hero-subtitle {
          max-width: 670px;
          margin: 0;
          color: #b4c4d8;
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
          background: linear-gradient(135deg, #0f766e, #0284c7);
          color: white;
          font-size: 0.96rem;
          font-weight: 800;
          box-shadow: 0 22px 40px rgba(2, 132, 199, 0.24);
        }

        .hero-secondary {
          padding: 1rem 1.25rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #edf4fb;
          font-size: 0.95rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }

        .hero-secondary:hover {
          background: rgba(255, 255, 255, 0.09);
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
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(148, 163, 184, 0.16);
          backdrop-filter: blur(12px);
        }

        .hero-stat-card strong {
          display: block;
          color: white;
          font-size: 1rem;
          font-weight: 800;
        }

        .hero-stat-card span {
          display: block;
          margin-top: 0.3rem;
          color: #9fb0c2;
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
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.18);
          color: #f6c872;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .hero-visual {
          position: relative;
          min-height: 640px;
        }

        .workspace-card {
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(8, 16, 28, 0.82);
          backdrop-filter: blur(18px);
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
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
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(10, 17, 27, 0.94));
          box-shadow: 0 28px 60px rgba(0, 0, 0, 0.32);
        }

        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .workspace-tag {
          padding: 0.42rem 0.72rem;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.22);
          color: #93c5fd;
        }

        .workspace-header h2,
        .workspace-side h3 {
          margin: 0.6rem 0 0;
          font-size: 1.2rem;
          line-height: 1.25;
        }

        .workspace-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.55rem 0.75rem;
          border-radius: 14px;
          background: rgba(245, 158, 11, 0.1);
          color: #f8c979;
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
          background: rgba(255, 255, 255, 0.05);
          color: #c8d6e5;
          font-size: 0.76rem;
          font-weight: 700;
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
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .snapshot-row strong {
          display: block;
          font-size: 0.92rem;
        }

        .snapshot-row small {
          display: block;
          margin-top: 0.2rem;
          color: #8fa1b4;
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
          background: linear-gradient(180deg, rgba(20, 31, 48, 0.88), rgba(10, 17, 27, 0.8));
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .activity-title {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: #f3f8fe;
          font-size: 0.83rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
        }

        .activity-row {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          color: #aec0d3;
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .activity-row + .activity-row {
          margin-top: 0.65rem;
        }

        .activity-row svg {
          margin-top: 0.18rem;
          flex-shrink: 0;
          color: #5eead4;
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
          color: #9fb0c2;
          font-size: 0.76rem;
        }

        .side-metric strong {
          text-align: right;
          font-size: 0.84rem;
        }

        .side-action {
          width: 100%;
          margin-top: 1rem;
          padding: 0.85rem 0.95rem;
          border-radius: 14px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #111827;
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
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.14);
          backdrop-filter: blur(12px);
        }

        .capability-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(245, 158, 11, 0.16));
          color: #f7fafc;
        }

        .capability-card h3 {
          margin: 1rem 0 0.5rem;
          font-size: 1rem;
        }

        .capability-card p {
          margin: 0;
          color: #a9bbcd;
          font-size: 0.84rem;
          line-height: 1.65;
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
          background: rgba(15, 118, 110, 0.14);
          border: 1px solid rgba(45, 212, 191, 0.18);
          color: #7dd3fc;
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
          color: #a7b9ca;
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
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03)),
            linear-gradient(135deg, rgba(14, 165, 233, 0.08), transparent);
          border: 1px solid rgba(148, 163, 184, 0.14);
        }

        .workflow-index {
          display: inline-flex;
          margin-bottom: 1.2rem;
          color: #f6b951;
          font-size: 1.65rem;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .workflow-card p {
          margin: 0;
          max-width: 220px;
          color: #e6eef7;
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
          background:
            linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(14, 116, 144, 0.14)),
            rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(94, 234, 212, 0.14);
        }

        .closing-login {
          min-width: 120px;
        }

        @media (max-width: 1080px) {
          .hero-panel,
          .capabilities-band,
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

          .landing-main {
            padding-top: 1rem;
            padding-bottom: 2.4rem;
          }

          .hero-actions,
          .closing-actions,
          .nav-actions {
            width: 100%;
          }

          .nav-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .hero-primary,
          .hero-secondary,
          .nav-link,
          .nav-cta,
          .side-action {
            width: 100%;
            justify-content: center;
          }

          .workspace-main,
          .workspace-side,
          .capability-card,
          .closing-cta {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .workspace-header,
          .snapshot-row,
          .closing-cta {
            flex-direction: column;
            align-items: flex-start;
          }

          .snapshot-meta {
            width: 100%;
            text-align: left;
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
