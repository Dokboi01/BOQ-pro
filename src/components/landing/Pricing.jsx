import React from 'react';
import { Check, Shield, Zap, Building2, GraduationCap } from 'lucide-react';

const PricingPage = ({ onSelectPlan, onBack }) => {
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
            popular: false
        }
    ];

    return (
        <div className="pricing-container view-fade-in">
            <nav className="pricing-nav">
                <div className="logo" onClick={onBack} style={{ cursor: 'pointer' }}>
                    <Shield size={24} className="text-accent-600" />
                    <span>BOQ <strong>PRO</strong><sup>®</sup></span>
                </div>
                <button className="btn-outline" onClick={onBack}>Back to Home</button>
            </nav>

            <div className="pricing-header">
                <span className="badge">Flexible Pricing</span>
                <h1>Built for Every Scale of <span>Construction</span></h1>
                <p>From university projects to national infrastructure, BOQ Pro provides the precision and control you need.</p>
            </div>

            <div className="pricing-grid">
                {plans.map((plan, index) => (
                    <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                        {plan.popular && <div className="popular-badge">Most Popular</div>}
                        <div className="plan-icon">{plan.icon}</div>
                        <h3>{plan.name}</h3>
                        <div className="price">
                            <span className="amount">{plan.price}</span>
                            {plan.period && <span className="period">{plan.period}</span>}
                        </div>
                        <p className="plan-desc">{plan.description}</p>

                        <ul className="feature-list">
                            {plan.features.map((feature, fIndex) => (
                                <li key={fIndex}>
                                    <Check size={16} className="text-success" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            className={`plan-cta ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => onSelectPlan(plan.name)}
                        >
                            {plan.cta}
                        </button>
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
          background: var(--bg-main);
          padding: 2rem 8%;
          color: var(--primary-900);
        }

        .pricing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          color: var(--primary-900);
        }

        .pricing-header {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 5rem;
        }

        .badge {
          display: inline-block;
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-600);
          padding: 0.4rem 1rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1.5rem;
        }

        h1 {
          font-size: 3.5rem;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }

        h1 span {
          color: var(--accent-600);
        }

        p {
          font-size: 1.125rem;
          color: var(--primary-600);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2.5rem;
          margin-bottom: 6rem;
        }

        .pricing-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          padding: 3rem 2.5rem;
          position: relative;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent-400);
        }

        .pricing-card.popular {
          border: 2px solid var(--accent-500);
          box-shadow: var(--shadow-lg);
        }

        .popular-badge {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--accent-500);
          color: white;
          padding: 0.4rem 1.2rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .plan-icon {
          margin-bottom: 1.5rem;
        }

        h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .price {
          margin-bottom: 1.5rem;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .amount {
          font-size: 2.5rem;
          font-weight: 800;
        }

        .period {
          color: var(--primary-500);
          font-size: 1.125rem;
        }

        .plan-desc {
          font-size: 0.875rem;
          margin-bottom: 2.5rem;
          min-height: 3rem;
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
          color: var(--primary-700);
        }

        .plan-cta {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
        }

        .pricing-footer {
          text-align: center;
          padding-top: 4rem;
          border-top: 1px solid var(--border-light);
        }

        .pricing-footer p {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--primary-400);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 2rem;
        }

        .trust-logos {
          display: flex;
          justify-content: center;
          gap: 4rem;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--primary-300);
        }

        .text-success { color: var(--success-600); }
      `}</style>
        </div>
    );
};

export default PricingPage;
