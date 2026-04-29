import React from 'react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Ruler,
  Shield,
} from 'lucide-react';

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80&auto=format&fit=crop',
  site: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1400&q=80&auto=format&fit=crop',
};

const proofPoints = [
  'Regional benchmark rates',
  'Custom rate build-up',
  'PDF and Excel schedules',
];

const featureRows = [
  {
    icon: <Calculator size={18} />,
    title: 'Rate build-up for real QS work',
    copy: 'Separate materials, labour, plant, transport, overhead, and profit before the final rate is accepted.',
  },
  {
    icon: <Ruler size={18} />,
    title: 'BOQ structure that stays intact',
    copy: 'Keep sections, quantities, units, notes, and review status together from draft through submission.',
  },
  {
    icon: <FileSpreadsheet size={18} />,
    title: 'Exports that match the job',
    copy: 'Move from working estimate to client-ready PDF and Excel schedules without rebuilding the file.',
  },
];

const processSteps = [
  'Set the project location and trade sections',
  'Measure quantities against the BOQ item list',
  'Compare benchmark and custom rate evidence',
  'Review allowances before export',
];

const outcomeTiles = [
  { value: 'Lagos, Abuja, PH', label: 'Regional pricing context where the project is happening' },
  { value: 'One BOQ record', label: 'Quantities, notes, pricing basis, and exports remain connected' },
  { value: 'Team review', label: 'Estimator, QS, and contractor decisions stay visible' },
];

const HomePage = ({ onGetStarted, onLogin }) => {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-image">
          <img src={IMAGES.hero} alt="Construction professionals reviewing work on site" loading="eager" />
          <div className="home-hero-shade" />
        </div>

        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="home-kicker">
              <Shield size={14} />
              Built for Nigerian construction pricing
            </span>

            <h1>BOQ Pro</h1>

            <p className="home-subtitle">
              A calm commercial workspace for quantity takeoff, defensible rate build-up, team review,
              and submission-ready BOQ exports.
            </p>

            <div className="home-actions">
              <button className="home-btn-primary" onClick={onGetStarted}>
                Start a company workspace
                <ArrowRight size={18} />
              </button>
              <button className="home-btn-secondary" onClick={onLogin}>
                Sign in
              </button>
            </div>
          </div>

          <div className="home-hero-proof" aria-label="BOQ Pro workflow highlights">
            {proofPoints.map((point) => (
              <span key={point}>{point}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="home-features" aria-label="Core BOQ Pro functions">
        {featureRows.map(({ icon, title, copy }) => (
          <article key={title} className="home-feature">
            <div className="home-feature-icon">{icon}</div>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="home-process">
        <div className="home-section-head">
          <span className="home-section-kicker">Daily workflow</span>
          <h2>Designed around the way Nigerian pricing teams move.</h2>
          <p>
            BOQ Pro keeps the work close to the decisions construction users make every day: location,
            quantity, rate evidence, allowance, and export.
          </p>
        </div>

        <div className="home-process-grid">
          {processSteps.map((step, index) => (
            <div key={step} className="home-step">
              <span className="home-step-index">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="home-outcomes">
          {outcomeTiles.map(({ value, label }) => (
            <div key={label} className="home-outcome">
              <CheckCircle2 size={16} />
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-closing">
        <div className="home-closing-bg">
          <img src={IMAGES.site} alt="Construction site with active project work" loading="lazy" />
          <div className="home-closing-overlay" />
        </div>

        <div className="home-closing-copy">
          <span className="home-section-kicker">Start with one real job</span>
          <h2>Price a BOQ, defend the rate, and export the schedule from the same workspace.</h2>
          <p>
            The first test should be practical: one project, one trade section, one rate that the team can explain.
          </p>
          <div className="home-actions">
            <button className="home-btn-primary" onClick={onGetStarted}>
              Get started free
              <ArrowRight size={18} />
            </button>
            <button className="home-btn-secondary home-btn-secondary-dark" onClick={onLogin}>
              Log in
            </button>
          </div>
        </div>
      </section>

      <style jsx="true">{`
        .home-page {
          position: relative;
          display: grid;
          gap: 4rem;
        }

        .home-hero {
          position: relative;
          width: 100vw;
          min-height: 72svh;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          overflow: hidden;
          display: grid;
          align-items: center;
          isolation: isolate;
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(240,253,244,0.92));
        }

        .home-hero-image,
        .home-hero-image img,
        .home-hero-shade {
          position: absolute;
          inset: 0;
        }

        .home-hero-image {
          z-index: -2;
          left: auto;
          width: min(46vw, 640px);
          opacity: 0.95;
        }

        .home-hero-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }

        .home-hero-shade {
          z-index: -1;
          background:
            linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.82) 42%, rgba(255,255,255,0.5) 72%, rgba(255,255,255,0.18) 100%),
            linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.56) 100%);
        }

        .home-hero-inner {
          width: min(1280px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 4.5rem 0 2rem;
          display: grid;
          gap: 2rem;
        }

        .home-hero-copy {
          max-width: 650px;
          color: var(--primary-950);
          padding-right: 1rem;
        }

        .home-kicker,
        .home-section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.75rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .home-kicker {
          color: var(--accent-700);
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.16);
        }

        .home-section-kicker {
          color: var(--accent-600);
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.16);
        }

        .home-hero h1 {
          margin: 1rem 0 0.9rem;
          color: var(--primary-950);
          font-size: clamp(3.2rem, 7vw, 5rem);
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .home-hero h1 span {
          color: var(--accent-600);
        }

        .home-subtitle {
          max-width: 620px;
          margin: 0;
          color: var(--primary-600);
          font-size: 1.08rem;
          line-height: 1.7;
        }

        .home-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          margin-top: 1.8rem;
        }

        .home-btn-primary,
        .home-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          min-height: 48px;
          padding: 0.9rem 1.2rem;
          border-radius: 8px;
          border: none;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform var(--duration-base) var(--ease-premium),
            box-shadow var(--duration-base) var(--ease-premium),
            background-color var(--duration-base) var(--ease-premium);
        }

        .home-btn-primary {
          background: var(--accent-600);
          color: white;
          box-shadow: 0 18px 30px rgba(4, 120, 87, 0.2);
        }

        .home-btn-secondary {
          background: rgba(255, 255, 255, 0.9);
          color: var(--primary-800);
          border: 1px solid var(--border-medium);
        }

        .home-btn-primary:hover,
        .home-btn-secondary:hover {
          transform: translateY(-2px);
        }

        .home-btn-secondary-dark {
          background: rgba(255, 255, 255, 0.95);
        }

        .home-hero-proof {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          max-width: 900px;
        }

        .home-hero-proof span {
          padding: 0.65rem 0.8rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(203, 213, 225, 0.72);
          color: var(--primary-700);
          font-size: 0.82rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
          box-shadow: var(--shadow-sm);
        }

        .home-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: var(--border-light);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          overflow: hidden;
        }

        .home-feature {
          padding: 1.4rem;
          background: white;
        }

        .home-feature-icon {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-600);
        }

        .home-feature h2 {
          margin: 1rem 0 0.45rem;
          font-size: 1rem;
          color: var(--primary-950);
          letter-spacing: 0;
        }

        .home-feature p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .home-process {
          display: grid;
          gap: 1.5rem;
        }

        .home-section-head {
          max-width: 680px;
        }

        .home-section-head h2 {
          margin: 1rem 0 0.65rem;
          font-size: 2.35rem;
          color: var(--primary-950);
          letter-spacing: 0;
        }

        .home-section-head p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.98rem;
          line-height: 1.75;
        }

        .home-process-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: var(--border-light);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          overflow: hidden;
        }

        .home-step {
          padding: 1.2rem;
          background: white;
        }

        .home-step-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--accent-600), var(--teal-600));
          color: white;
          font-size: 0.82rem;
          font-weight: 800;
        }

        .home-step p {
          margin: 0.9rem 0 0;
          color: var(--primary-700);
          font-size: 0.9rem;
          line-height: 1.6;
          font-weight: 600;
        }

        .home-outcomes {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .home-outcome {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .home-outcome svg {
          color: var(--accent-600);
          flex-shrink: 0;
        }

        .home-outcome strong {
          display: block;
          color: var(--primary-950);
          font-size: 0.95rem;
          font-weight: 800;
        }

        .home-outcome span {
          display: block;
          color: var(--primary-600);
          font-size: 0.76rem;
          line-height: 1.45;
        }

        .home-closing {
          position: relative;
          min-height: 360px;
          overflow: hidden;
          border-radius: 8px;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-xl);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(255,255,255,0.96));
        }

        .home-closing-bg,
        .home-closing-bg img,
        .home-closing-overlay {
          position: absolute;
          inset: 0;
        }

        .home-closing-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .home-closing-overlay {
          background: linear-gradient(90deg, rgba(255,255,255,0.94), rgba(255,255,255,0.72));
        }

        .home-closing-copy {
          position: relative;
          z-index: 1;
          max-width: 680px;
          padding: 3rem;
          color: var(--primary-950);
        }

        .home-closing-copy h2 {
          margin: 1rem 0 0.75rem;
          font-size: 2.55rem;
          color: var(--primary-950);
          letter-spacing: 0;
        }

        .home-closing-copy p {
          margin: 0;
          color: var(--primary-600);
          font-size: 1rem;
          line-height: 1.75;
        }

        @media (max-width: 1024px) {
          .home-hero-image {
            width: min(52vw, 520px);
          }

          .home-hero h1 {
            font-size: 4rem;
          }

          .home-features,
          .home-process-grid,
          .home-outcomes {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .home-hero {
            min-height: 82svh;
          }

          .home-hero-image {
            width: 100%;
            opacity: 0.28;
          }

          .home-hero-inner {
            padding: 4rem 0 1.5rem;
          }

          .home-hero h1 {
            font-size: 3.2rem;
          }

          .home-subtitle {
            font-size: 0.98rem;
          }

          .home-actions {
            display: grid;
          }

          .home-btn-primary,
          .home-btn-secondary {
            width: 100%;
          }

          .home-features,
          .home-process-grid,
          .home-outcomes {
            grid-template-columns: 1fr;
          }

          .home-section-head h2,
          .home-closing-copy h2 {
            font-size: 1.85rem;
          }

          .home-closing-copy {
            padding: 2rem 1.2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
