import React from 'react';
import {
  ArrowRight, Sparkles, Shield, Calculator, FileSpreadsheet,
  MessagesSquare, MapPin, HardHat, Layers3, BarChart3,
  CheckCircle2, TrendingUp, Building2, ClipboardCheck,
  FileText, Users, Award, Clock, ChevronRight,
  Construction, Wrench, Ruler
} from 'lucide-react';

/* ── Nigerian construction imagery ── */
const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=80',
  skyline: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?w=1200&q=80',
  site: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80',
  workers: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80',
  concrete: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&q=80',
};

const headlineStats = [
  { value: '24 hrs', label: 'Typical tender turnaround' },
  { value: '5 cities', label: 'Lagos, Abuja, PH, Ibadan, Kano' },
  { value: '1 workspace', label: 'Pricing, notes, reports, handoff' },
];

const capabilityCards = [
  {
    icon: <Calculator size={20} />,
    title: 'Custom Pricing That Feels Defendable',
    copy: 'Build rates from materials, labour, plant, transport, overheads, and profit instead of guessing a final number.',
  },
  {
    icon: <MessagesSquare size={20} />,
    title: 'One Workspace For The Team',
    copy: 'Keep pricing decisions, job notes, and follow-up tasks around the same BOQ so nothing gets lost in WhatsApp threads.',
  },
  {
    icon: <FileSpreadsheet size={20} />,
    title: 'Exports Ready For Real Submission',
    copy: 'Move from internal pricing to PDF and Excel outputs without rebuilding the job in another tool.',
  },
];

const trustSignals = [
  'Built for Quantity Surveyors',
  'Built for Contractors',
  'Built for Pre-con Teams',
  'Built for Company Rollout',
];

const projectSnapshot = [
  { section: 'Substructure', items: 12, rate: 'NGN 22.8M', state: 'Aligned' },
  { section: 'Blockwork', items: 19, rate: 'NGN 14.6M', state: 'Custom' },
  { section: 'Roofing', items: 8, rate: 'NGN 9.4M', state: 'Benchmark' },
];

const activityFeed = [
  'Custom pricing updated for backyard entrance gate',
  'Rates benchmarked against Lagos regional market',
  'BOQ export prepared for review',
];

const operatingLanes = [
  {
    icon: <Building2 size={20} />,
    title: 'Company Dashboard',
    copy: 'See which jobs are live, which teams are pricing, and which estimates are ready for review without chasing separate files.',
    points: ['Live job status and totals', 'Shared company workspace flow', 'Quick access to current commercial decisions'],
  },
  {
    icon: <ClipboardCheck size={20} />,
    title: 'Estimator Workflow',
    copy: 'Move from measurement to defendable rate build-up with regional benchmarks and custom pricing in the same screen.',
    points: ['Benchmark or custom rate per item', 'Quantity takeoff tied to BOQ units', 'Saved rate basis and pricing notes'],
  },
  {
    icon: <FileText size={20} />,
    title: 'Review And Handover',
    copy: 'Keep the final stretch clean with exports, review notes, and submission-ready schedules that still trace back to the working BOQ.',
    points: ['PDF and Excel outputs', 'Commercial review before handoff', 'One source of truth from draft to final'],
  },
];

const workflowSteps = [
  'Create or import the project structure',
  'Measure quantities and choose benchmark or custom pricing',
  'Review commercial allowances and internal notes',
  'Export client-ready BOQ schedules and reports',
];

const outcomeStrip = [
  { value: '1 source', label: 'No duplicate pricing sheets' },
  { value: 'Live rates', label: 'Benchmark and custom in one flow' },
  { value: 'Team-ready', label: 'Built for company rollout, not solo spreadsheets' },
];

const nigerianRegions = [
  { city: 'Lagos', stat: 'NGN 45K/m²', label: 'Average building cost' },
  { city: 'Abuja', stat: 'NGN 52K/m²', label: 'Average building cost' },
  { city: 'Port Harcourt', stat: 'NGN 48K/m²', label: 'Average building cost' },
  { city: 'Ibadan', stat: 'NGN 38K/m²', label: 'Average building cost' },
  { city: 'Kano', stat: 'NGN 35K/m²', label: 'Average building cost' },
];

const HomePage = ({ onGetStarted, onLogin }) => {
  return (
    <div className="home-page">
      {/* ═══════ HERO SECTION ═══════ */}
      <section className="hp-hero">
        <div className="hp-hero-visual">
          <img src={IMAGES.hero} alt="Nigerian construction site" className="hp-hero-img" loading="eager" />
          <div className="hp-hero-overlay" />
        </div>

        <div className="hp-hero-content">
          <div className="hp-hero-copy">
            <div className="hp-kicker">
              <Sparkles size={14} />
              BOQ workspace for estimators, QS teams, and contractors
            </div>

            <h1>
              From rough scope
              <span> to priced BOQ</span>
              without the usual chaos.
            </h1>

            <p className="hp-subtitle">
              BOQ Pro brings quantity takeoff, benchmark pricing, custom rate build-up, collaboration,
              and exports into one construction-focused workspace your team can actually use on live jobs
              across Nigeria.
            </p>

            <div className="hp-actions">
              <button className="hp-btn-primary" onClick={onGetStarted}>
                Create company workspace
                <ArrowRight size={18} />
              </button>
              <button className="hp-btn-secondary" onClick={onLogin}>
                Open existing account
              </button>
            </div>

            <div className="hp-stats">
              {headlineStats.map((stat) => (
                <div key={stat.label} className="hp-stat-card">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="hp-trust">
              {trustSignals.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
          </div>

          <div className="hp-hero-cards">
            <div className="hp-workspace-card hp-ws-main">
              <div className="hp-ws-header">
                <div>
                  <span className="hp-ws-tag"><HardHat size={12} /> Live project view</span>
                  <h3>3 Bedroom Duplex, Lekki</h3>
                </div>
                <span className="hp-ws-location">
                  <MapPin size={12} /> Lagos
                </span>
              </div>
              <div className="hp-ws-badges">
                <span><Layers3 size={12} /> 7 Sections</span>
                <span><BarChart3 size={12} /> NGN 68.4M Estimate</span>
                <span><Users size={12} /> Team pricing active</span>
              </div>
              <div className="hp-snapshot">
                {projectSnapshot.map((row) => (
                  <div key={row.section} className="hp-snap-row">
                    <div>
                      <strong>{row.section}</strong>
                      <small>{row.items} priced items</small>
                    </div>
                    <div className="hp-snap-meta">
                      <strong>{row.rate}</strong>
                      <span className={`hp-state-${row.state.toLowerCase()}`}>{row.state}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hp-activity">
                <div className="hp-activity-title"><Users size={13} /> Recent team activity</div>
                {activityFeed.map((item) => (
                  <div key={item} className="hp-activity-row">
                    <CheckCircle2 size={12} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hp-workspace-card hp-ws-side">
              <span className="hp-ws-tag"><Calculator size={12} /> Custom pricing studio</span>
              <h4>Rate build-up</h4>
              <div className="hp-metric"><span>Direct cost</span><strong>NGN 142,000</strong></div>
              <div className="hp-metric"><span>Commercial allowances</span><strong>18%</strong></div>
              <div className="hp-metric"><span>Final custom rate</span><strong>NGN 185,000</strong></div>
              <button className="hp-side-action" onClick={onGetStarted}>
                Try custom pricing <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ NIGERIAN REGIONS STRIP ═══════ */}
      <section className="hp-regions">
        <div className="hp-regions-heading">
          <span className="hp-section-kicker">Regional benchmarks</span>
          <h2>Priced for the Nigerian market</h2>
          <p>Real regional cost data for the cities where your projects actually happen.</p>
        </div>
        <div className="hp-regions-grid">
          {nigerianRegions.map((r) => (
            <div key={r.city} className="hp-region-card">
              <MapPin size={18} className="hp-region-icon" />
              <strong>{r.city}</strong>
              <span className="hp-region-stat">{r.stat}</span>
              <span className="hp-region-label">{r.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ CAPABILITIES ═══════ */}
      <section className="hp-capabilities">
        {capabilityCards.map(({ icon, title, copy }) => (
          <article key={title} className="hp-cap-card">
            <div className="hp-cap-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      {/* ═══════ OPERATING SYSTEM ═══════ */}
      <section className="hp-os">
        <div className="hp-os-heading">
          <span className="hp-section-kicker">Inside the app</span>
          <h2>A system built around how Nigerian construction teams work.</h2>
          <p>
            BOQ Pro is designed to carry a job from early measurement to final review
            without making the team jump across multiple tools.
          </p>
        </div>
        <div className="hp-os-grid">
          {operatingLanes.map(({ icon, title, copy, points }) => (
            <article key={title} className="hp-os-card">
              <div className="hp-os-head">
                <div className="hp-cap-icon hp-os-icon">{icon}</div>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </div>
              <div className="hp-os-points">
                {points.map((point) => (
                  <div key={point} className="hp-os-point">
                    <CheckCircle2 size={14} />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="hp-outcomes">
          {outcomeStrip.map(({ value, label }) => (
            <div key={label} className="hp-outcome">
              <TrendingUp size={18} />
              <div><strong>{value}</strong><span>{label}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ WORKFLOW STEPS ═══════ */}
      <section className="hp-workflow">
        <div className="hp-os-heading">
          <span className="hp-section-kicker">How it works</span>
          <h2>Built around how pricing teams actually move.</h2>
        </div>
        <div className="hp-workflow-grid">
          {workflowSteps.map((step, index) => (
            <div key={step} className="hp-wf-card">
              <span className="hp-wf-index">0{index + 1}</span>
              <p>{step}</p>
              {index < workflowSteps.length - 1 && (
                <div className="hp-wf-connector"><ChevronRight size={18} /></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ NIGERIAN CONSTRUCTION IMAGERY BAND ═══════ */}
      <section className="hp-gallery">
        <div className="hp-gallery-grid">
          <div className="hp-gallery-item hp-gallery-large">
            <img src={IMAGES.skyline} alt="Nigerian city skyline" loading="lazy" />
            <div className="hp-gallery-caption">
              <strong>City-scale projects</strong>
              <span>From Lekki to Maitama — priced with local benchmarks</span>
            </div>
          </div>
          <div className="hp-gallery-item">
            <img src={IMAGES.workers} alt="Construction workers on site" loading="lazy" />
            <div className="hp-gallery-caption">
              <strong>Site reality</strong>
              <span>Labour, plant, and logistics — all in the rate</span>
            </div>
          </div>
          <div className="hp-gallery-item">
            <img src={IMAGES.concrete} alt="Concrete pouring" loading="lazy" />
            <div className="hp-gallery-caption">
              <strong>Material accuracy</strong>
              <span>Real-time material pricing across Nigeria</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CLOSING CTA ═══════ */}
      <section className="hp-cta">
        <div className="hp-cta-bg">
          <img src={IMAGES.site} alt="Construction site" loading="lazy" />
          <div className="hp-cta-overlay" />
        </div>
        <div className="hp-cta-content">
          <span className="hp-section-kicker">Ready to test it?</span>
          <h2>Start with one company account and one real project.</h2>
          <p>Use BOQ Pro to price one job properly, pressure-test the workflow, and grow from there.</p>
          <div className="hp-cta-actions">
            <button className="hp-btn-primary" onClick={onGetStarted}>
              Get started free <ArrowRight size={18} />
            </button>
            <button className="hp-btn-secondary" onClick={onLogin}>
              Log in
            </button>
          </div>
        </div>
      </section>

      <style jsx="true">{`
        .home-page { position: relative; }

        /* ── Hero ── */
        .hp-hero {
          position: relative;
          min-height: 92vh;
          display: flex;
          align-items: center;
          width: 100%;
          overflow: hidden;
          margin-bottom: 4rem;
        }

        .hp-hero-visual {
          position: absolute;
          inset: 0;
          z-index: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }

        .hp-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          margin: 0;
          padding: 0;
        }

        .hp-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(10, 15, 26, 0.92) 0%,
            rgba(10, 15, 26, 0.78) 45%,
            rgba(10, 15, 26, 0.55) 100%
          );
        }

        .hp-hero-content {
          position: relative;
          z-index: 2;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
          gap: 3rem;
          padding: 4rem 1.5rem;
          align-items: center;
        }

        .hp-hero-copy { color: white; }

        .hp-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 0.9rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: var(--accent-400);
          margin-bottom: 1.5rem;
        }

        .hp-hero-copy h1 {
          margin: 0 0 1.25rem;
          font-size: clamp(2.6rem, 5vw, 4.2rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
          color: white;
          max-width: 12ch;
        }

        .hp-hero-copy h1 span {
          display: block;
          color: var(--accent-400);
        }

        .hp-subtitle {
          max-width: 560px;
          margin: 0;
          color: rgba(255, 255, 255, 0.75);
          font-size: 1.05rem;
          line-height: 1.75;
        }

        .hp-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-top: 2rem;
        }

        .hp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 1rem 1.4rem;
          border-radius: 16px;
          border: none;
          background: var(--accent-600);
          color: white;
          font-size: 0.96rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 14px 32px rgba(16, 185, 129, 0.28);
        }

        .hp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(16, 185, 129, 0.35);
          background: var(--emerald-500);
        }

        .hp-btn-secondary {
          padding: 1rem 1.3rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: white;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .hp-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.35);
        }

        .hp-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 2.5rem;
        }

        .hp-stat-card {
          padding: 1rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
        }

        .hp-stat-card strong {
          display: block;
          color: white;
          font-size: 1.05rem;
          font-weight: 800;
        }

        .hp-stat-card span {
          display: block;
          margin-top: 0.3rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.76rem;
          line-height: 1.5;
        }

        .hp-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin-top: 1.5rem;
        }

        .hp-trust span {
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.72rem;
          font-weight: 700;
        }

        /* Hero cards */
        .hp-hero-cards {
          position: relative;
          min-height: 520px;
        }

        .hp-workspace-card {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
        }

        .hp-ws-main {
          padding: 1.4rem;
          color: white;
        }

        .hp-ws-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.8rem;
        }

        .hp-ws-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--accent-300);
        }

        .hp-ws-header h3 {
          margin: 0.5rem 0 0;
          font-size: 1.1rem;
          color: white;
        }

        .hp-ws-location {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.4rem 0.6rem;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.15);
          color: var(--amber-300);
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .hp-ws-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.9rem;
        }

        .hp-ws-badges span {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.4rem 0.6rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .hp-snapshot {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .hp-snap-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hp-snap-row strong { display: block; font-size: 0.86rem; color: white; }
        .hp-snap-row small { display: block; margin-top: 0.15rem; color: rgba(255,255,255,0.5); font-size: 0.68rem; }

        .hp-snap-meta { text-align: right; }
        .hp-snap-meta strong { color: white; font-size: 0.84rem; }

        .hp-state-aligned, .hp-state-custom, .hp-state-benchmark {
          display: inline-flex;
          align-items: center;
          margin-top: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          font-size: 0.62rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .hp-state-aligned { background: rgba(34, 197, 94, 0.2); color: #86efac; }
        .hp-state-custom { background: rgba(14, 165, 233, 0.2); color: #7dd3fc; }
        .hp-state-benchmark { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }

        .hp-activity {
          margin-top: 0.9rem;
          padding: 0.85rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hp-activity-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: white;
          font-size: 0.78rem;
          font-weight: 800;
          margin-bottom: 0.6rem;
        }

        .hp-activity-row {
          display: flex;
          align-items: flex-start;
          gap: 0.45rem;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.74rem;
          line-height: 1.5;
        }

        .hp-activity-row + .hp-activity-row { margin-top: 0.5rem; }
        .hp-activity-row svg { margin-top: 0.12rem; flex-shrink: 0; color: var(--accent-400); }

        .hp-ws-side {
          position: absolute;
          right: -1rem;
          bottom: 0;
          width: min(260px, 80%);
          padding: 1rem;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08));
          color: white;
        }

        .hp-ws-side h4 { margin: 0.5rem 0 0.6rem; font-size: 1rem; }

        .hp-metric {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.6rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .hp-metric:last-of-type { border-bottom: none; }
        .hp-metric span { color: rgba(255,255,255,0.6); font-size: 0.74rem; }
        .hp-metric strong { text-align: right; font-size: 0.84rem; color: white; }

        .hp-side-action {
          width: 100%;
          margin-top: 0.8rem;
          padding: 0.75rem;
          border-radius: 12px;
          border: none;
          background: var(--accent-600);
          color: white;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .hp-side-action:hover { background: var(--emerald-500); }

        /* ── Section kicker ── */
        .hp-section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.14);
          color: var(--accent-600);
          margin-bottom: 1rem;
        }

        /* ── Regions ── */
        .hp-regions {
          margin: 4rem 0;
          padding: 2.5rem;
          border-radius: 28px;
          background: linear-gradient(135deg, var(--obsidian-900), var(--obsidian-800));
          color: white;
        }

        .hp-regions-heading { text-align: center; margin-bottom: 2rem; }
        .hp-regions-heading h2 { margin: 0.5rem 0 0.5rem; font-size: clamp(1.6rem, 3vw, 2.2rem); color: white; }
        .hp-regions-heading p { color: var(--obsidian-300); margin: 0; font-size: 0.95rem; }

        .hp-regions-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1rem;
        }

        .hp-region-card {
          padding: 1.4rem 1rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
          transition: all 0.2s ease;
        }

        .hp-region-card:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-3px);
        }

        .hp-region-icon {
          color: var(--accent-400);
          margin: 0 auto 0.6rem;
          display: block;
        }

        .hp-region-card strong { display: block; color: white; font-size: 1rem; margin-bottom: 0.4rem; }
        .hp-region-stat { display: block; color: var(--accent-400); font-size: 0.9rem; font-weight: 700; }
        .hp-region-label { display: block; color: var(--obsidian-400); font-size: 0.72rem; margin-top: 0.2rem; }

        /* ── Capabilities ── */
        .hp-capabilities {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.2rem;
          margin: 3rem 0;
        }

        .hp-cap-card {
          padding: 1.8rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
          transition: all 0.25s ease;
        }

        .hp-cap-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--border-medium);
        }

        .hp-cap-icon {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }

        .hp-cap-card h3 { margin: 1.1rem 0 0.55rem; font-size: 1.05rem; color: var(--primary-950); }
        .hp-cap-card p { margin: 0; color: var(--primary-600); font-size: 0.88rem; line-height: 1.65; }

        /* ── OS Section ── */
        .hp-os { margin: 4rem 0; }
        .hp-os-heading { text-align: center; max-width: 640px; margin: 0 auto 2rem; }
        .hp-os-heading h2 { margin: 0.6rem 0 0.6rem; font-size: clamp(1.6rem, 3vw, 2.4rem); color: var(--primary-950); }
        .hp-os-heading p { color: var(--primary-600); font-size: 1rem; line-height: 1.7; margin: 0; }

        .hp-os-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.2rem;
        }

        .hp-os-card {
          padding: 1.6rem;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98));
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .hp-os-head {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 1rem;
          align-items: flex-start;
        }

        .hp-os-icon { width: 48px; height: 48px; border-radius: 16px; }
        .hp-os-card h3 { margin: 0 0 0.4rem; font-size: 1.05rem; color: var(--primary-950); }
        .hp-os-card p { margin: 0; color: var(--primary-600); font-size: 0.86rem; line-height: 1.7; }

        .hp-os-points { display: grid; gap: 0.6rem; margin-top: 1.1rem; }
        .hp-os-point {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 0.85rem;
          border-radius: 14px;
          background: var(--primary-50);
          border: 1px solid rgba(203, 213, 225, 0.6);
          color: var(--primary-700);
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .hp-os-point svg { flex-shrink: 0; margin-top: 0.08rem; color: var(--accent-600); }

        .hp-outcomes {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1.2rem;
        }

        .hp-outcome {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.1rem 1.2rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .hp-outcome svg { color: var(--accent-600); flex-shrink: 0; }
        .hp-outcome strong { display: block; font-size: 1rem; color: var(--primary-950); }
        .hp-outcome span { display: block; font-size: 0.8rem; color: var(--primary-600); }

        /* ── Workflow ── */
        .hp-workflow { margin: 4rem 0; }
        .hp-workflow-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }

        .hp-wf-card {
          position: relative;
          padding: 1.6rem;
          border-radius: 22px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .hp-wf-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-900), var(--accent-600));
          color: white;
          font-size: 0.9rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .hp-wf-card p { margin: 0; color: var(--primary-700); font-size: 0.92rem; line-height: 1.6; font-weight: 600; }

        .hp-wf-connector {
          position: absolute;
          right: -1.5rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--accent-600);
          z-index: 2;
        }

        /* ── Gallery ── */
        .hp-gallery { margin: 4rem 0; }
        .hp-gallery-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 1rem;
          height: 480px;
        }

        .hp-gallery-item {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
        }

        .hp-gallery-large {
          grid-row: 1 / -1;
        }

        .hp-gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s ease;
        }

        .hp-gallery-item:hover img { transform: scale(1.04); }

        .hp-gallery-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.4rem;
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
          color: white;
        }

        .hp-gallery-caption strong { display: block; font-size: 1.05rem; margin-bottom: 0.25rem; }
        .hp-gallery-caption span { font-size: 0.8rem; color: rgba(255,255,255,0.7); }

        /* ── CTA ── */
        .hp-cta {
          position: relative;
          border-radius: 32px;
          overflow: hidden;
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          margin-top: 4rem;
        }

        .hp-cta-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .hp-cta-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hp-cta-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(10,15,26,0.88), rgba(10,15,26,0.72));
        }

        .hp-cta-content {
          position: relative;
          z-index: 2;
          color: white;
          max-width: 600px;
          padding: 3rem;
        }

        .hp-cta-content h2 {
          margin: 0.8rem 0 0.8rem;
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          color: white;
        }

        .hp-cta-content p {
          color: rgba(255,255,255,0.7);
          font-size: 1rem;
          line-height: 1.7;
          margin: 0 0 1.8rem;
        }

        .hp-cta-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 0.9rem;
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .hp-hero-content { grid-template-columns: 1fr; padding: 3rem 1rem; }
          .hp-hero-cards { display: none; }
          .hp-regions-grid { grid-template-columns: repeat(3, 1fr); }
          .hp-capabilities { grid-template-columns: repeat(2, 1fr); }
          .hp-os-grid { grid-template-columns: repeat(2, 1fr); }
          .hp-workflow-grid { grid-template-columns: repeat(2, 1fr); }
          .hp-gallery-grid { grid-template-columns: 1fr 1fr; height: auto; }
          .hp-gallery-large { grid-row: auto; }
        }

        @media (max-width: 640px) {
          .hp-stats { grid-template-columns: 1fr; }
          .hp-regions-grid { grid-template-columns: 1fr 1fr; }
          .hp-capabilities { grid-template-columns: 1fr; }
          .hp-os-grid { grid-template-columns: 1fr; }
          .hp-workflow-grid { grid-template-columns: 1fr; }
          .hp-wf-connector { display: none; }
          .hp-gallery-grid { grid-template-columns: 1fr; height: auto; }
          .hp-outcomes { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
