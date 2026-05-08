import React from 'react';
import {
  Shield, MapPin, Users, Award, Target, Heart,
  Building2, TrendingUp, ArrowRight, CheckCircle2
} from 'lucide-react';

const values = [
  {
    icon: <Target size={20} />,
    title: 'Accuracy First',
    desc: 'We believe every rate should be traceable, defensible, and grounded in real market data.',
  },
  {
    icon: <Users size={20} />,
    title: 'Built For Teams',
    desc: 'Construction is a team sport. Quantra is designed for collaboration, not solo spreadsheets.',
  },
  {
    icon: <MapPin size={20} />,
    title: 'Nigeria-Focused',
    desc: 'Generic tools don\'t understand Nigerian markets. We do — because we built this for them.',
  },
  {
    icon: <Heart size={20} />,
    title: 'QS-Owned',
    desc: 'Created by people who have priced real Nigerian construction jobs, not just written software.',
  },
];

const milestones = [
  { year: '2023', title: 'Idea Born', desc: 'Frustrated with spreadsheet chaos on live Lagos projects.' },
  { year: '2024', title: 'First Workspace', desc: 'Built the core BOQ engine with custom rate build-up.' },
  { year: '2024', title: 'Team Pricing', desc: 'Added real-time collaboration and project sharing.' },
  { year: '2025', title: 'Drawing Tools', desc: 'Drawing analysis and annotation features launched.' },
  { year: '2026', title: 'Nationwide', desc: 'Regional benchmarks for 5 Nigerian cities, 46+ materials.' },
];

const AboutPage = ({ onGetStarted }) => {
  return (
    <div className="about-page">
      {/* Hero */}
      <section className="ap-hero">
        <div className="ap-hero-content">
          <span className="ap-kicker">About Us</span>
          <h1>Built by Nigerian construction people, for Nigerian construction people.</h1>
          <p>
            Quantra was born out of frustration. Frustration with spreadsheets that break,
            rates that can\'t be defended, and teams that lose track of pricing decisions
            in WhatsApp threads. We set out to build something better.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="ap-mission">
        <div className="ap-mission-card">
          <h2>Our Mission</h2>
          <p>
            To make construction pricing in Nigeria more accurate, more transparent, and more collaborative.
            We believe that when estimators and quantity surveyors have the right tools, the entire industry wins —
            from contractors to clients to the workers on site.
          </p>
          <div className="ap-mission-stats">
            <div><strong>5</strong><span>Cities covered</span></div>
            <div><strong>46+</strong><span>Materials tracked</span></div>
            <div><strong>24h</strong><span>Typical tender turnaround</span></div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="ap-values">
        <div className="ap-section-heading">
          <h2>What drives us</h2>
          <p>The principles that shape every feature we build.</p>
        </div>
        <div className="ap-values-grid">
          {values.map((v) => (
            <article key={v.title} className="ap-value-card">
              <div className="ap-value-icon">{v.icon}</div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="ap-timeline">
        <div className="ap-section-heading">
          <h2>Our journey</h2>
          <p>From a simple idea to a platform serving Nigerian construction teams.</p>
        </div>
        <div className="ap-timeline-list">
          {milestones.map((m) => (
            <div key={m.year} className="ap-timeline-item">
              <span className="ap-timeline-year">{m.year}</span>
              <div className="ap-timeline-dot" />
              <div className="ap-timeline-body">
                <h4>{m.title}</h4>
                <p>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Nigerian Focus */}
      <section className="ap-nigeria">
        <div className="ap-nigeria-content">
          <h2>Why Nigeria?</h2>
          <p>
            Nigeria\'s construction industry is one of the largest in Africa, yet it has been underserved by
            modern pricing technology. Most teams still rely on Excel templates that don\'t understand local
            material costs, labour rates, or regional variations.
          </p>
          <p>
            We built Quantra to change that. With real benchmarks for Lagos, Abuja, Port Harcourt, Ibadan, and Kano,
            we\'re giving Nigerian construction professionals the tools they deserve.
          </p>
          <div className="ap-nigeria-badges">
            <span><CheckCircle2 size={14} /> NIQS-aligned workflows</span>
            <span><CheckCircle2 size={14} /> QSRBN-compliant exports</span>
            <span><CheckCircle2 size={14} /> NGN-native billing</span>
            <span><CheckCircle2 size={14} /> Local support</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ap-cta">
        <h2>Join the team pricing better.</h2>
        <p>Be part of the movement to professionalise Nigerian construction estimating.</p>
        <button className="ap-btn-primary" onClick={onGetStarted}>
          Start free <ArrowRight size={18} />
        </button>
      </section>

      <style jsx="true">{`
        .about-page { position: relative; }

        .ap-hero {
          text-align: center;
          padding: 3rem 1rem 2rem;
          max-width: 720px;
          margin: 0 auto;
        }

        .ap-kicker {
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

        .ap-hero h1 {
          margin: 0 0 1rem;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: var(--primary-950);
        }

        .ap-hero p {
          color: var(--primary-600);
          font-size: 1.05rem;
          line-height: 1.7;
          margin: 0;
        }

        .ap-mission {
          margin: 2rem 0 3rem;
        }

        .ap-mission-card {
          padding: 2.5rem;
          border-radius: 28px;
          background: linear-gradient(135deg, var(--obsidian-900), var(--obsidian-800));
          color: white;
          text-align: center;
        }

        .ap-mission-card h2 {
          margin: 0 0 0.8rem;
          font-size: clamp(1.4rem, 3vw, 2rem);
          color: white;
        }

        .ap-mission-card > p {
          color: var(--obsidian-300);
          font-size: 1rem;
          line-height: 1.7;
          max-width: 640px;
          margin: 0 auto 1.5rem;
        }

        .ap-mission-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .ap-mission-stats div {
          padding: 1rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ap-mission-stats strong {
          display: block;
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--accent-400);
        }

        .ap-mission-stats span {
          display: block;
          margin-top: 0.25rem;
          font-size: 0.78rem;
          color: var(--obsidian-400);
        }

        .ap-section-heading {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .ap-section-heading h2 {
          margin: 0 0 0.4rem;
          font-size: clamp(1.4rem, 3vw, 1.8rem);
          color: var(--primary-950);
        }

        .ap-section-heading p {
          color: var(--primary-600);
          font-size: 0.95rem;
          margin: 0;
        }

        .ap-values { margin: 3rem 0; }

        .ap-values-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.2rem;
        }

        .ap-value-card {
          padding: 1.6rem;
          border-radius: 22px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .ap-value-icon {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
          margin-bottom: 0.8rem;
        }

        .ap-value-card h3 { margin: 0 0 0.4rem; font-size: 1.05rem; color: var(--primary-950); }
        .ap-value-card p { margin: 0; color: var(--primary-600); font-size: 0.88rem; line-height: 1.65; }

        .ap-timeline { margin: 3rem 0; }

        .ap-timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0;
          max-width: 600px;
          margin: 0 auto;
        }

        .ap-timeline-item {
          display: grid;
          grid-template-columns: 60px 24px 1fr;
          gap: 1rem;
          align-items: flex-start;
          padding: 1.2rem 0;
          position: relative;
        }

        .ap-timeline-item:not(:last-child)::after {
          content: '';
          position: absolute;
          left: 72px;
          top: 44px;
          width: 2px;
          height: calc(100% - 24px);
          background: var(--border-light);
        }

        .ap-timeline-year {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--accent-600);
          text-align: right;
          padding-top: 0.2rem;
        }

        .ap-timeline-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent-600);
          border: 3px solid white;
          box-shadow: 0 0 0 2px var(--accent-200);
          margin-top: 0.3rem;
          z-index: 2;
        }

        .ap-timeline-body h4 { margin: 0 0 0.2rem; font-size: 1rem; color: var(--primary-950); }
        .ap-timeline-body p { margin: 0; color: var(--primary-600); font-size: 0.86rem; line-height: 1.5; }

        .ap-nigeria {
          margin: 3rem 0;
          padding: 2.5rem;
          border-radius: 28px;
          background: linear-gradient(135deg, #064e3b, #065f46);
          color: white;
        }

        .ap-nigeria-content { max-width: 720px; }
        .ap-nigeria-content h2 { margin: 0 0 1rem; font-size: clamp(1.4rem, 3vw, 1.8rem); color: white; }
        .ap-nigeria-content p { color: rgba(255,255,255,0.8); font-size: 0.95rem; line-height: 1.7; margin: 0 0 1rem; }

        .ap-nigeria-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          margin-top: 1.2rem;
        }

        .ap-nigeria-badges span {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.85rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .ap-cta {
          text-align: center;
          margin-top: 3rem;
          padding: 2.5rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .ap-cta h2 { margin: 0 0 0.5rem; font-size: clamp(1.3rem, 3vw, 1.8rem); color: var(--primary-950); }
        .ap-cta p { color: var(--primary-600); margin: 0 0 1.2rem; font-size: 0.95rem; }

        .ap-btn-primary {
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

        .ap-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
        }

        @media (max-width: 768px) {
          .ap-values-grid { grid-template-columns: 1fr; }
          .ap-mission-stats { grid-template-columns: 1fr; }
          .ap-timeline-item { grid-template-columns: 50px 20px 1fr; }
          .ap-timeline-item:not(:last-child)::after { left: 60px; }
        }
      `}</style>
    </div>
  );
};

export default AboutPage;
