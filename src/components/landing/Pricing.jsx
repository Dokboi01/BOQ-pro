import React from 'react';
import { Check, Shield, Zap, Building2, GraduationCap } from 'lucide-react';

const PricingPage = ({ onSelectPlan, onBack, error }) => {
  const [loadingPlan, setLoadingPlan] = React.useState(null);

  const handleSelect = async (planName) => {
    setLoadingPlan(planName);
    await onSelectPlan(planName);
    setLoadingPlan(null);
  };
  const plans = [
    {
      name: 'Student & Basic',
      icon: <GraduationCap size={24} className="text-primary-500" />,
      price: 'Free',
      description: 'Perfect for learning the fundamentals of quantity surveying.',
      features: [
        'Up to 3 active projects',
        'Basic BOQ calculations',
        'Standard PDF exports',
        'Community support',
        'Essential material library'
      ],
      cta: 'Start Learning',
      popular: false
    },
    {
      name: 'Practitioner',
      icon: <Zap size={24} className="text-accent-500" />,
      price: '₦25,000',
      period: '/month',
      description: 'Advanced tools for professional engineers and surveyors.',
      features: [
        'Unlimited projects',
        'Material Intelligence AI',
        'Professional CSV/PDF reports',
        'Priority email support',
        'Advanced rate analysis',
        'Custom material libraries'
      ],
      cta: 'Get Professional',
      popular: true
    },
    {
      name: 'Enterprise',
      icon: <Building2 size={24} className="text-primary-900" />,
      price: 'Custom',
      description: 'Scalable solutions for firms and government institutions.',
      features: [
        'Team management & roles',
        'Multi-user collaboration',
        'Audit logs & compliance',
        'Dedicated account manager',
        'SSO & API access',
        'Institutional licensing'
      ],
      cta: 'Contact Sales',
      contactEmail: 'adedokunhassan01@gmail.com',
      contactPhone: '08151148095',
      popular: false
    }
  ];

  return (
    <div className="pricing-container view-fade-in">
      <div className="hero-bg-gradient"></div>
      <div className="hero-bg-grid"></div>

      <nav className="pricing-nav">
        <div className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
          <Shield size={28} className="text-accent-500" />
          <span>BOQ <strong>PRO</strong><sup>®</sup></span>
        </div>
        <div className="header-actions">
          <button className="btn-text" onClick={onBack}>Back to Home</button>
        </div>
      </nav>

      <div className="pricing-header">
        <span className="badge">Flexible Pricing</span>
        <h1>Built for Every Scale of <span>Construction</span></h1>
        <p>From university projects to national infrastructure, BOQ Pro provides the precision and control you need.</p>

        {error && (
          <div className="pricing-error-banner view-fade-in">
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div key={index} className={`pricing-card glass-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            <div className="plan-icon-container">{plan.icon}</div>
            <h3 className="plan-name">{plan.name}</h3>
            <div className="price-display">
              <span className="currency">₦</span>
              <span className="amount">{plan.price.replace('₦', '')}</span>
              {plan.period && <span className="period">{plan.period}</span>}
            </div>
            <p className="plan-desc">{plan.description}</p>

            <div className="divider"></div>

            <ul className="feature-list">
              {plan.features.map((feature, fIndex) => (
                <li key={fIndex}>
                  <div className="check-icon">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.name === 'Enterprise' ? (
              <div className="contact-details">
                <a href={`mailto:${plan.contactEmail}`} className="plan-cta btn-hero-primary mb-2">
                  Contact Sales Support
                </a>
              </div>
            ) : (
              <button
                className={`plan-cta ${plan.popular ? 'btn-hero-primary' : 'btn-hero-secondary'} ${loadingPlan === plan.name ? 'loading' : ''}`}
                onClick={() => handleSelect(plan.name)}
                disabled={!!loadingPlan}
              >
                {loadingPlan === plan.name ? 'Working...' : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <p>Trusted by professionals at</p>
        <div className="trust-logos">
          <span>NIQS</span>
          <span>COREN</span>
          <span>FMWH</span>
          <span>NSE</span>
        </div>
      </div>

      <style jsx="true">{`
        .pricing-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0f1d 0%, #1a1f35 100%);
          padding: 2rem 5%;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .hero-bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.12) 0%, transparent 40%),
                      radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.12) 0%, transparent 40%);
          pointer-events: none;
        }

        .hero-bg-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }

        .pricing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4rem;
          position: relative;
          z-index: 10;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .btn-text {
          background: none;
          border: none;
          color: #94a3b8;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.3s;
        }

        .btn-text:hover { color: white; }

        .pricing-header {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 5rem;
          position: relative;
          z-index: 10;
        }

        .badge {
          display: inline-block;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.3);
          color: #60a5fa;
          padding: 0.5rem 1.25rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }

        h1 {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
        }

        h1 span {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pricing-header p {
          font-size: 1.25rem;
          color: #94a3b8;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          margin-bottom: 6rem;
          position: relative;
          z-index: 10;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
        }

        .pricing-card {
          position: relative;
          padding: 3.5rem 2.5rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .pricing-card:hover {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.3);
        }

        .pricing-card.popular {
          border: 2px solid rgba(59, 130, 246, 0.6);
          background: rgba(37, 99, 235, 0.08);
          box-shadow: 0 15px 35px -10px rgba(37, 99, 235, 0.2);
        }

        .pricing-card.popular:hover {
          box-shadow: 0 30px 60px -15px rgba(37, 99, 235, 0.4);
        }

        .popular-badge {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          padding: 0.625rem 1.75rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
          animation: pulse-badge 2s ease-in-out infinite;
        }

        @keyframes pulse-badge {
          0%, 100% { box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
          50% { box-shadow: 0 8px 30px rgba(37, 99, 235, 0.6); }
        }

        .plan-icon-container {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          transition: all 0.3s;
        }

        .pricing-card:hover .plan-icon-container {
          transform: scale(1.1) rotate(-5deg);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
        }

        .plan-name {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .price-display {
          margin-bottom: 1.5rem;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .currency {
          font-size: 1.5rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .amount {
          font-size: 3rem;
          font-weight: 900;
        }

        .period {
          color: #64748b;
          font-size: 1rem;
          font-weight: 600;
        }

        .plan-desc {
          font-size: 0.875rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 2rem;
          min-height: 2.5rem;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin-bottom: 2rem;
        }

        .feature-list {
          list-style: none;
          margin-bottom: 3rem;
          flex: 1;
        }

        .feature-list li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          color: #cbd5e1;
        }

        .check-icon {
          width: 20px;
          height: 20px;
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .plan-cta {
          width: 100%;
          padding: 1rem;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
        }

        .btn-hero-primary {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
        }

        .btn-hero-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(37, 99, 235, 0.3);
        }

        .btn-hero-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .pricing-footer {
          text-align: center;
          padding-top: 4rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 10;
        }

        .pricing-footer p {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 2rem;
        }

        .trust-logos {
          display: flex;
          justify-content: center;
          gap: 4rem;
          font-size: 1.5rem;
          font-weight: 900;
          color: #1e293b;
        }

        .text-success { color: var(--success-600); }

        .contact-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pricing-error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          color: #f87171;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin: 2rem auto 0;
          max-width: 500px;
        }

        .error-icon {
          width: 20px;
          height: 20px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
        }

        .plan-cta.loading {
          opacity: 0.7;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
