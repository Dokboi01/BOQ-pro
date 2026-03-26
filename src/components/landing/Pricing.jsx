import React from 'react';
import {
  Check,
  Shield,
  Zap,
  Building2,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Calculator,
  FileSpreadsheet,
  MessagesSquare,
  Mail,
  Phone,
  Sparkles
} from 'lucide-react';

const PricingPage = ({ onSelectPlan, onBack, error }) => {
  const [loadingPlan, setLoadingPlan] = React.useState(null);

  const plans = [
    {
      name: 'Student & Basic',
      tone: 'student',
      icon: <GraduationCap size={22} />,
      price: 'Free',
      period: '',
      bestFor: 'Best for learning, coursework, and smaller practice jobs.',
      description: 'A clean entry point for students and early-stage practitioners who need structured BOQ workflow without a monthly cost.',
      features: [
        'Up to 3 active projects',
        'Core BOQ calculations',
        'Standard PDF exports',
        'Essential material library',
        'Basic rate build-up support'
      ],
      note: 'Start here if you are learning the workflow or testing the app with light-volume jobs.',
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Practitioner',
      tone: 'practitioner',
      icon: <Zap size={22} />,
      price: 'NGN 25,000',
      period: '/month',
      bestFor: 'Best for active QS teams, contractors, and estimators.',
      description: 'The strongest option for real project delivery, custom pricing, deeper reports, and the day-to-day work of commercial teams.',
      features: [
        'Unlimited projects',
        'Benchmark plus custom pricing',
        'Professional PDF and CSV exports',
        'Advanced rate analysis',
        'Priority support',
        'Custom material libraries'
      ],
      note: 'This is the plan that fits the way BOQ Pro is built today: serious pricing work, not just trial use.',
      cta: 'Choose Practitioner',
      popular: true
    },
    {
      name: 'Enterprise',
      tone: 'enterprise',
      icon: <Building2 size={22} />,
      price: 'Custom',
      period: '',
      bestFor: 'Best for company rollout, admin control, and managed onboarding.',
      description: 'For firms that want BOQ Pro set up as a company system with structured rollout, closer support, and broader deployment needs.',
      features: [
        'Team access and rollout support',
        'Shared company workspace setup',
        'Review flow and admin guidance',
        'Priority onboarding support',
        'Institutional licensing path',
        'Commercial deployment assistance'
      ],
      note: 'If you want to onboard a whole firm, this is the conversation to have.',
      cta: 'Talk To Sales',
      contactEmail: 'adedokunhassan01@gmail.com',
      contactPhone: '08151148095',
      popular: false
    }
  ];

  const rolloutCards = [
    {
      icon: <Calculator size={18} />,
      title: 'Pricing Teams',
      copy: 'Move from raw quantities to defendable custom rates without breaking the workflow into separate spreadsheets.'
    },
    {
      icon: <MessagesSquare size={18} />,
      title: 'Company Rollout',
      copy: 'Give one company a single commercial workspace instead of leaving each estimator with their own disconnected files.'
    },
    {
      icon: <FileSpreadsheet size={18} />,
      title: 'Submission Output',
      copy: 'Keep the same working BOQ all the way through to exports, reviews, and final handoff.'
    }
  ];

  const summaryStats = [
    { value: '1 app', label: 'Pricing, review, and export in one place' },
    { value: 'Custom-ready', label: 'Built for benchmark and custom rate workflow' },
    { value: 'Company-first', label: 'Designed to grow from one user to one team' }
  ];

  const handleSelect = async (planName) => {
    setLoadingPlan(planName);
    await onSelectPlan(planName);
    setLoadingPlan(null);
  };

  return (
    <div className="pricing-shell">
      <div className="pricing-atmosphere" />
      <div className="pricing-grid-overlay" />

      <nav className="pricing-nav">
        <button className="brand-mark" onClick={onBack}>
          <span className="brand-icon">
            <Shield size={18} />
          </span>
          <span className="brand-copy">
            <strong>BOQ Pro</strong>
            <small>Commercial workspace for construction teams</small>
          </span>
        </button>

        <button className="nav-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to home
        </button>
      </nav>

      <main className="pricing-main">
        <section className="pricing-hero">
          <div className="pricing-copy">
            <div className="section-kicker">
              <Sparkles size={14} />
              Pricing built around real BOQ work
            </div>

            <h1>
              Choose the plan that matches
              <span> how your team prices.</span>
            </h1>

            <p className="pricing-subtitle">
              The same product story from the base page carries here: BOQ Pro is strongest when it
              supports live pricing work, company rollout, and clean project handoff without the
              usual spreadsheet sprawl.
            </p>

            {error && (
              <div className="pricing-error-banner">
                <span className="error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <div className="summary-strip">
              {summaryStats.map((stat) => (
                <div key={stat.label} className="summary-card">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pricing-preview">
            <span className="preview-tag">Rollout view</span>
            <h2>Start with one estimator. Scale into one company workspace.</h2>

            <div className="preview-points">
              <div className="preview-point">
                <span className="preview-index">01</span>
                <p>Test the workflow on a real job with clean BOQ structure and quantity takeoff.</p>
              </div>
              <div className="preview-point">
                <span className="preview-index">02</span>
                <p>Move into benchmark plus custom pricing with reviewable rate basis and notes.</p>
              </div>
              <div className="preview-point">
                <span className="preview-index">03</span>
                <p>Roll the same workspace into exports, review, and company handoff.</p>
              </div>
            </div>

            <div className="preview-contact">
              <div>
                <span>Need a company rollout?</span>
                <strong>Enterprise onboarding is available.</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={`plan-card tone-${plan.tone} ${plan.popular ? 'popular' : ''}`}>
              <div className="plan-top-row">
                <div className="plan-icon-container">{plan.icon}</div>
                {plan.popular && <span className="popular-badge">Recommended</span>}
              </div>

              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-best-for">{plan.bestFor}</p>

              <div className="price-display">
                <strong>{plan.price}</strong>
                {plan.period && <span>{plan.period}</span>}
              </div>

              <p className="plan-desc">{plan.description}</p>

              <div className="feature-list">
                {plan.features.map((feature) => (
                  <div key={feature} className="feature-row">
                    <div className="check-icon">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="plan-note">{plan.note}</div>

              {plan.name === 'Enterprise' ? (
                <div className="enterprise-actions">
                  <a href={`mailto:${plan.contactEmail}`} className="plan-cta plan-cta-primary">
                    {plan.cta}
                    <ArrowRight size={16} />
                  </a>
                  <div className="enterprise-contact-meta">
                    <span><Mail size={14} /> {plan.contactEmail}</span>
                    <span><Phone size={14} /> {plan.contactPhone}</span>
                  </div>
                </div>
              ) : (
                <button
                  className={`plan-cta ${plan.popular ? 'plan-cta-primary' : 'plan-cta-secondary'} ${loadingPlan === plan.name ? 'loading' : ''}`}
                  onClick={() => handleSelect(plan.name)}
                  disabled={!!loadingPlan}
                >
                  {loadingPlan === plan.name ? 'Working...' : plan.cta}
                  {loadingPlan !== plan.name && <ArrowRight size={16} />}
                </button>
              )}
            </article>
          ))}
        </section>

        <section className="rollout-section">
          <div className="section-heading">
            <span className="section-kicker">What you unlock</span>
            <h2>Each step should feel closer to the real product, not marketing fluff.</h2>
            <p>
              The design here now matches the upgraded base page: practical, lighter, and focused on
              the actual work BOQ teams do inside the app.
            </p>
          </div>

          <div className="rollout-grid">
            {rolloutCards.map(({ icon, title, copy }) => (
              <article key={title} className="rollout-card">
                <div className="rollout-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <style jsx="true">{`
        .pricing-shell {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.09), transparent 30%),
            radial-gradient(circle at 88% 16%, rgba(217, 119, 6, 0.08), transparent 22%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 54%, #f1f5f9 100%);
          color: var(--primary-900);
          font-family: var(--font-main);
        }

        .pricing-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(96, 165, 250, 0.18), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(251, 191, 36, 0.12), transparent 18%);
          pointer-events: none;
        }

        .pricing-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(203, 213, 225, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.4) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 92%);
          pointer-events: none;
        }

        .pricing-nav,
        .pricing-main {
          position: relative;
          z-index: 2;
          width: min(1220px, calc(100% - 2rem));
          margin: 0 auto;
        }

        .pricing-nav {
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
          box-shadow: 0 18px 35px rgba(37, 99, 235, 0.24);
          color: white;
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

        .nav-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid var(--border-medium);
          border-radius: 999px;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.78);
          color: var(--primary-700);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .nav-back-btn:hover {
          transform: translateY(-1px);
          background: white;
          border-color: var(--primary-400);
        }

        .pricing-main {
          padding: 2rem 0 4rem;
        }

        .pricing-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(320px, 0.96fr);
          gap: 2rem;
          align-items: start;
        }

        .pricing-copy {
          padding: 1.8rem 0 1rem;
        }

        .section-kicker,
        .preview-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .section-kicker {
          padding: 0.55rem 0.9rem;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.16);
          color: var(--accent-600);
          box-shadow: 0 8px 18px rgba(59, 130, 246, 0.08);
        }

        .pricing-copy h1 {
          margin: 1.25rem 0 1rem;
          font-size: clamp(2.9rem, 7vw, 5rem);
          line-height: 0.96;
          letter-spacing: -0.05em;
          color: var(--primary-950);
        }

        .pricing-copy h1 span {
          display: block;
          color: var(--accent-600);
        }

        .pricing-subtitle {
          max-width: 700px;
          margin: 0;
          color: var(--primary-600);
          font-size: 1.04rem;
          line-height: 1.75;
        }

        .pricing-error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.4rem;
          max-width: 620px;
          padding: 0.9rem 1rem;
          border-radius: 16px;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.25);
          color: #dc2626;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .error-icon {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #dc2626;
          color: white;
          flex-shrink: 0;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .summary-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 2rem;
        }

        .summary-card {
          padding: 1rem 1.05rem;
          border-radius: 20px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .summary-card strong {
          display: block;
          color: var(--primary-900);
          font-size: 0.98rem;
          font-weight: 800;
        }

        .summary-card span {
          display: block;
          margin-top: 0.28rem;
          color: var(--primary-500);
          font-size: 0.78rem;
          line-height: 1.5;
        }

        .pricing-preview {
          padding: 1.4rem;
          border-radius: 30px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(14px);
        }

        .preview-tag {
          padding: 0.42rem 0.72rem;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.14);
          color: var(--accent-600);
        }

        .pricing-preview h2 {
          margin: 0.9rem 0 1rem;
          font-size: 1.35rem;
          line-height: 1.2;
          color: var(--primary-950);
        }

        .preview-points {
          display: grid;
          gap: 0.8rem;
        }

        .preview-point {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.8rem;
          align-items: start;
          padding: 0.9rem 0.95rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-light);
        }

        .preview-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: var(--primary-50);
          color: var(--accent-600);
          font-size: 0.78rem;
          font-weight: 900;
        }

        .preview-point p {
          margin: 0;
          color: var(--primary-700);
          font-size: 0.86rem;
          line-height: 1.65;
        }

        .preview-contact {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
          color: white;
        }

        .preview-contact span {
          display: block;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.55);
        }

        .preview-contact strong {
          display: block;
          margin-top: 0.35rem;
          font-size: 0.95rem;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 2.6rem;
        }

        .plan-card {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }

        .plan-card.popular {
          border-color: rgba(37, 99, 235, 0.3);
          box-shadow: 0 18px 40px rgba(37, 99, 235, 0.12);
        }

        .tone-student .plan-icon-container {
          background: rgba(15, 23, 42, 0.06);
          color: var(--primary-800);
        }

        .tone-practitioner .plan-icon-container {
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-600);
        }

        .tone-enterprise .plan-icon-container {
          background: rgba(217, 119, 6, 0.1);
          color: #b45309;
        }

        .plan-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .plan-icon-container {
          width: 52px;
          height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
        }

        .popular-badge {
          padding: 0.42rem 0.72rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-600);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .plan-name {
          margin: 1rem 0 0.35rem;
          font-size: 1.34rem;
          color: var(--primary-950);
        }

        .plan-best-for {
          margin: 0;
          color: var(--primary-500);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .price-display {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
          margin: 1.15rem 0 0.5rem;
        }

        .price-display strong {
          font-size: 2rem;
          font-weight: 900;
          color: var(--primary-950);
          letter-spacing: -0.04em;
        }

        .price-display span {
          color: var(--primary-500);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .plan-desc {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.86rem;
          line-height: 1.7;
        }

        .feature-list {
          display: grid;
          gap: 0.72rem;
          margin: 1.4rem 0;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-light);
          flex: 1;
        }

        .feature-row {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          color: var(--primary-700);
          font-size: 0.84rem;
          line-height: 1.55;
        }

        .check-icon {
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
          flex-shrink: 0;
        }

        .plan-note {
          padding: 0.9rem;
          border-radius: 16px;
          background: var(--primary-50);
          border: 1px solid rgba(203, 213, 225, 0.65);
          color: var(--primary-600);
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .plan-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          width: 100%;
          margin-top: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          border: 1px solid transparent;
          font-size: 0.92rem;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .plan-cta:hover {
          transform: translateY(-2px);
        }

        .plan-cta-primary {
          background: var(--primary-900);
          color: white;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.16);
        }

        .plan-cta-secondary {
          background: white;
          color: var(--primary-700);
          border-color: var(--border-medium);
        }

        .plan-cta-secondary:hover {
          background: var(--primary-50);
          border-color: var(--primary-400);
        }

        .plan-cta.loading {
          pointer-events: none;
          opacity: 0.7;
        }

        .enterprise-actions {
          margin-top: 1rem;
        }

        .enterprise-contact-meta {
          display: grid;
          gap: 0.45rem;
          margin-top: 0.85rem;
          color: var(--primary-600);
          font-size: 0.82rem;
        }

        .enterprise-contact-meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .rollout-section {
          margin-top: 3.3rem;
        }

        .section-heading {
          max-width: 760px;
        }

        .section-heading h2 {
          margin: 1rem 0 0.7rem;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.06;
          letter-spacing: -0.04em;
          color: var(--primary-950);
        }

        .section-heading p {
          margin: 0;
          max-width: 720px;
          color: var(--primary-600);
          line-height: 1.75;
        }

        .rollout-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1.4rem;
        }

        .rollout-card {
          padding: 1.35rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .rollout-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }

        .rollout-card h3 {
          margin: 1rem 0 0.45rem;
          font-size: 1rem;
          color: var(--primary-950);
        }

        .rollout-card p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.65;
        }

        @media (max-width: 1080px) {
          .pricing-hero,
          .pricing-grid,
          .rollout-grid,
          .summary-strip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .pricing-nav {
            gap: 1rem;
            align-items: flex-start;
            flex-direction: column;
          }

          .pricing-copy h1 {
            font-size: clamp(2.6rem, 12vw, 4rem);
          }
        }

        @media (max-width: 640px) {
          .pricing-nav,
          .pricing-main {
            width: min(1220px, calc(100% - 1.25rem));
          }

          .pricing-nav {
            position: sticky;
            top: 0;
            z-index: 20;
            padding: 0.9rem 0 0.8rem;
            background: rgba(248, 250, 252, 0.92);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid rgba(203, 213, 225, 0.7);
          }

          .pricing-main {
            padding-top: 1rem;
            padding-bottom: 3rem;
          }

          .brand-copy small {
            display: none;
          }

          .pricing-copy {
            padding-top: 0.4rem;
          }

          .section-kicker {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .pricing-copy h1 {
            font-size: clamp(2.25rem, 12vw, 3rem);
            line-height: 1.02;
          }

          .summary-strip {
            display: flex;
            overflow-x: auto;
            gap: 0.75rem;
            padding-bottom: 0.2rem;
            scroll-snap-type: x proximity;
          }

          .summary-card {
            min-width: 220px;
            flex: 0 0 auto;
            scroll-snap-align: start;
          }

          .pricing-preview,
          .plan-card,
          .rollout-card {
            border-radius: 22px;
          }

          .plan-card,
          .rollout-card {
            padding: 1.15rem;
          }

          .price-display strong {
            font-size: 1.8rem;
          }

          .rollout-grid {
            gap: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
