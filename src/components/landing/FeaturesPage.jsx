import React from 'react';
import {
  Calculator, FileSpreadsheet, MessagesSquare, BarChart3,
  Shield, Layers3, MapPin, Clock, CheckCircle2,
  ArrowRight, HardHat, FileText, Users, TrendingUp,
  Cloud, Lock, Download, Database, PenTool, Ruler
} from 'lucide-react';

const featureGroups = [
  {
    icon: <Calculator size={22} />,
    title: 'BOQ Workspace',
    description: 'The core pricing engine where estimates come to life. Built for the way Nigerian construction teams actually work.',
    features: [
      { name: 'Custom Rate Build-Up', desc: 'Materials + labour + plant + transport + overheads + profit = defendable rates.' },
      { name: 'Benchmark Pricing', desc: 'Pre-loaded regional benchmarks for Lagos, Abuja, Port Harcourt, Ibadan, and Kano.' },
      { name: 'Quantity Takeoff', desc: 'Measure directly against BOQ line items with proper unit tracking.' },
      { name: 'Section Management', desc: 'Organise by substructure, superstructure, finishes, MEP, and custom sections.' },
    ],
  },
  {
    icon: <FileSpreadsheet size={22} />,
    title: 'Exports & Reports',
    description: 'Move from working estimate to client-ready documents without rebuilding anything.',
    features: [
      { name: 'PDF BOQ Schedules', desc: 'Professional, branded PDF exports ready for tender submission.' },
      { name: 'Excel Exports', desc: 'Full Excel workbooks with formulas intact for further analysis.' },
      { name: 'Cost Summary Reports', desc: 'High-level summaries for management and client presentations.' },
      { name: 'Variance Reports', desc: 'Compare benchmark vs custom pricing to justify decisions.' },
    ],
  },
  {
    icon: <MessagesSquare size={22} />,
    title: 'Team Collaboration',
    description: 'Keep everyone on the same page — literally. No more scattered WhatsApp pricing threads.',
    features: [
      { name: 'Shared Projects', desc: 'Team members access the same BOQ with real-time updates.' },
      { name: 'Pricing Notes', desc: 'Attach commercial rationale to every line item.' },
      { name: 'Activity Feed', desc: 'See who changed what and when — full audit trail.' },
      { name: 'Role-Based Access', desc: 'Estimator, reviewer, and admin permissions built in.' },
    ],
  },
  {
    icon: <Database size={22} />,
    title: 'Material Library',
    description: 'A living database of Nigerian construction materials with real market pricing.',
    features: [
      { name: '46+ Materials', desc: 'Cement, reinforcement, roofing, tiles, paint, and more.' },
      { name: 'Market Indices', desc: 'Track price movements across 8 key material categories.' },
      { name: 'Custom Materials', desc: 'Add your own suppliers and rates to the library.' },
      { name: 'Regional Pricing', desc: 'Materials priced differently for Lagos vs Kano vs Abuja.' },
    ],
  },
  {
    icon: <Shield size={22} />,
    title: 'Security & Compliance',
    description: 'Enterprise-grade security with Nigerian data sovereignty in mind.',
    features: [
      { name: 'Firebase Auth', desc: 'Secure email/password + magic link authentication.' },
      { name: 'Firestore Database', desc: 'Encrypted cloud storage with role-based access rules.' },
      { name: 'Paystack Billing', desc: 'NGN-native billing with 256-bit SSL encryption.' },
      { name: 'Audit Logging', desc: 'Every action logged for compliance and dispute resolution.' },
    ],
  },
];

const stats = [
  { value: '5', label: 'Nigerian cities with benchmarks' },
  { value: '46+', label: 'Materials in the library' },
  { value: '3', label: 'Export formats (PDF, Excel, JSON)' },
  { value: '24h', label: 'Average tender turnaround' },
];

const FeaturesPage = ({ onGetStarted }) => {
  return (
    <div className="features-page">
      {/* Hero */}
      <section className="fp-hero">
        <div className="fp-hero-content">
          <span className="fp-kicker">Features</span>
          <h1>Everything you need to price Nigerian construction properly.</h1>
          <p>
            From first measurement to final handover — Quantra gives you the tools
            that quantity surveyors, estimators, and contractors actually use on live jobs.
          </p>
          <button className="fp-btn-primary" onClick={onGetStarted}>
            Start pricing free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="fp-stats">
        {stats.map((s) => (
          <div key={s.label} className="fp-stat">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </section>

      {/* Feature Groups */}
      <section className="fp-grid">
        {featureGroups.map((group) => (
          <article key={group.title} className="fp-card">
            <div className="fp-card-head">
              <div className="fp-icon">{group.icon}</div>
              <div>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
            </div>
            <div className="fp-features">
              {group.features.map((f) => (
                <div key={f.name} className="fp-feature-row">
                  <CheckCircle2 size={16} className="fp-check" />
                  <div>
                    <strong>{f.name}</strong>
                    <span>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="fp-bottom-cta">
        <h2>Ready to see it in action?</h2>
        <p>Create a free account and price your first project in under 10 minutes.</p>
        <button className="fp-btn-primary" onClick={onGetStarted}>
          Get started free <ArrowRight size={18} />
        </button>
      </section>

      <style jsx="true">{`
        .features-page { position: relative; }

        .fp-hero {
          text-align: center;
          padding: 3rem 1rem 2.5rem;
          max-width: 720px;
          margin: 0 auto;
        }

        .fp-kicker {
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

        .fp-hero h1 {
          margin: 0 0 1rem;
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: var(--primary-950);
        }

        .fp-hero p {
          color: var(--primary-600);
          font-size: 1.05rem;
          line-height: 1.7;
          margin: 0 0 1.5rem;
        }

        .fp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.95rem 1.4rem;
          border-radius: 16px;
          border: none;
          background: var(--primary-900);
          color: white;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
          font-family: inherit;
        }

        .fp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
        }

        .fp-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .fp-stat {
          text-align: center;
          padding: 1.4rem 1rem;
          border-radius: 20px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .fp-stat strong {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: var(--accent-600);
          letter-spacing: -0.03em;
        }

        .fp-stat span {
          display: block;
          margin-top: 0.3rem;
          color: var(--primary-600);
          font-size: 0.82rem;
        }

        .fp-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.2rem;
        }

        .fp-card {
          padding: 1.8rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
          transition: all 0.25s ease;
        }

        .fp-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
        }

        .fp-card-head {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.2rem;
        }

        .fp-icon {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
          flex-shrink: 0;
        }

        .fp-card-head h3 { margin: 0 0 0.3rem; font-size: 1.1rem; color: var(--primary-950); }
        .fp-card-head p { margin: 0; color: var(--primary-600); font-size: 0.86rem; line-height: 1.6; }

        .fp-features {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .fp-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.8rem 1rem;
          border-radius: 14px;
          background: var(--primary-50);
          border: 1px solid rgba(203, 213, 225, 0.5);
        }

        .fp-check {
          color: var(--accent-600);
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .fp-feature-row strong {
          display: block;
          font-size: 0.88rem;
          color: var(--primary-900);
          margin-bottom: 0.15rem;
        }

        .fp-feature-row span {
          font-size: 0.8rem;
          color: var(--primary-600);
          line-height: 1.5;
        }

        .fp-bottom-cta {
          text-align: center;
          margin-top: 4rem;
          padding: 3rem;
          border-radius: 28px;
          background: linear-gradient(135deg, var(--obsidian-900), var(--obsidian-800));
          color: white;
        }

        .fp-bottom-cta h2 { margin: 0 0 0.6rem; font-size: clamp(1.4rem, 3vw, 2rem); color: white; }
        .fp-bottom-cta p { color: var(--obsidian-300); margin: 0 0 1.5rem; font-size: 1rem; }

        @media (max-width: 900px) {
          .fp-stats { grid-template-columns: repeat(2, 1fr); }
          .fp-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .fp-stats { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};

export default FeaturesPage;
