import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Check,
  X,
  Shield,
  Zap,
  Building2,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Crown,
  Rocket,
  Sparkles,
  Layers3,
  Mail,
  Phone
} from 'lucide-react';
import { PLANS, PLAN_NAMES, PLAN_TIER_ORDER, FEATURE_COMPARISON, getPaystackCheckoutSupport, isPaidPlan } from '../../data/plans';
import { paystackCheckout, isPaystackConfigured, verifyPendingPaystackCheckout } from '../../utils/paystack';

const PLAN_ICONS = {
  [PLAN_NAMES.STUDENT]: GraduationCap,
  [PLAN_NAMES.STARTER]: Rocket,
  [PLAN_NAMES.PROFESSIONAL]: Zap,
  [PLAN_NAMES.BUSINESS]: Briefcase,
  [PLAN_NAMES.CORPORATE]: Crown,
  [PLAN_NAMES.ENTERPRISE]: Building2,
};

const PLAN_TONES = {
  [PLAN_NAMES.STUDENT]: 'student',
  [PLAN_NAMES.STARTER]: 'starter',
  [PLAN_NAMES.PROFESSIONAL]: 'professional',
  [PLAN_NAMES.BUSINESS]: 'business',
  [PLAN_NAMES.CORPORATE]: 'corporate',
  [PLAN_NAMES.ENTERPRISE]: 'enterprise',
};

const TRUST_SIGNALS = [
  'Built for Nigerian QS Firms',
  'Built for Lagos Contractors',
  'Built for Regional Estimators',
  'Built for Company Rollout'
];

const VALUE_CARDS = [
  {
    icon: Layers3,
    title: 'Nigerian Construction Workspace',
    copy: 'Pricing built for Lagos, Abuja, Port Harcourt, Ibadan, and Kano markets — with regional benchmarks and NGN-native billing.'
  },
  {
    icon: Zap,
    title: 'QS-First Workflow',
    copy: 'Plans are framed around real Nigerian QS workflows: market-rate pricing, custom build-ups, tender-ready exports, and team review.'
  },
  {
    icon: BarChart3,
    title: 'Built For Nigerian Firms',
    copy: 'Start solo as a student QS, grow into a professional estimator, then scale to a full firm with admin controls and company rollout.'
  }
];

const PricingPage = ({ onSelectPlan, onBack, onLogin, error, userEmail, userId }) => {
  const [billing, setBilling] = useState('monthly');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const plansRef = useRef(null);
  const comparisonRef = useRef(null);

  const displayError = error || localError;
  const previewPlans = [PLAN_NAMES.STUDENT, PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.BUSINESS];

  useEffect(() => {
    if (!userEmail || !userId || typeof window === 'undefined') return undefined;

    const params = new URLSearchParams(window.location.search);
    if (params.get('paystack') !== 'return') return undefined;

    let active = true;

    const finalizeReturn = async () => {
      setLoadingPlan('paystack-return');
      try {
        const verification = await verifyPendingPaystackCheckout({ allowPending: false });
        if (!active) return;

        if (verification?.verified) {
          await onSelectPlan(verification.context?.planName || verification.session?.planName, {
            ...verification,
            transaction: verification.transaction,
            billing: verification.context?.billingCycle || verification.session?.billing || 'monthly',
            verified: true,
            profile: verification.profile || null,
          });
        } else {
          setLocalError('Payment was not completed yet. You can retry the checkout from the pricing cards below.');
        }
      } catch (verifyError) {
        if (active) {
          setLocalError(verifyError.message || 'We could not confirm the Paystack payment yet.');
        }
      } finally {
        if (active) {
          setLoadingPlan(null);
          params.delete('paystack');
          const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
          window.history.replaceState({}, document.title, nextUrl);
        }
      }
    };

    finalizeReturn();

    return () => {
      active = false;
    };
  }, [onSelectPlan, userEmail, userId]);

  const scrollToSection = (ref, revealComparison = false) => {
    if (revealComparison) {
      setShowComparison(true);
    }
    requestAnimationFrame(() => {
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    });
  };

  const handleSelect = useCallback(async (planName) => {
    setLocalError(null);
    const plan = PLANS[planName];
    if (!plan) return;

    // Free plan — go straight to signup
    if (!isPaidPlan(planName)) {
      setLoadingPlan(planName);
      await onSelectPlan(planName);
      setLoadingPlan(null);
      return;
    }

    // Enterprise — mailto (handled in JSX)
    if (planName === PLAN_NAMES.ENTERPRISE) return;

    const checkoutSupport = getPaystackCheckoutSupport(planName, billing);
    if (!checkoutSupport.supported) {
      setLocalError(checkoutSupport.reason);
      return;
    }

    // Paid plan — signed-out users first create/login to a real account
    if (!userEmail || !userId) {
      setLoadingPlan(planName);
      await onSelectPlan(planName, { billing });
      setLoadingPlan(null);
      return;
    }

    // Paid plan — secure Paystack checkout
    if (!isPaystackConfigured()) {
      setLocalError('Paystack is not configured yet. Add the frontend public key and backend Paystack environment variables before starting paid checkout.');
      return;
    }

    setLoadingPlan(planName);
    try {
      await paystackCheckout({
        email: userEmail,
        userId,
        planName,
        billing,
        onSuccess: async (verification) => {
          console.log('✅ Payment verified:', verification);
          await onSelectPlan(planName, {
            ...verification,
            transaction: verification.transaction,
            billing,
            verified: true,
            profile: verification.profile || null,
          });
          setLoadingPlan(null);
        },
        onCancel: () => {
          console.log('🚪 Payment cancelled');
          setLoadingPlan(null);
        }
      });
    } catch (err) {
      console.error('❌ Paystack error:', err);
      setLocalError(err.message || 'Payment failed. Please try again.');
      setLoadingPlan(null);
    }
  }, [billing, onSelectPlan, userEmail, userId]);

  const savingsPercent = 17;

  return (
    <div className="pricing-shell">
      <div className="pricing-atmosphere" />
      <div className="pricing-grid-overlay" />

      {/* ── Navigation ── */}
      <nav className="pricing-nav">
        <button className="brand-mark" onClick={onBack}>
          <span className="brand-icon"><Shield size={18} /></span>
          <span className="brand-copy">
            <strong>BOQ Pro</strong>
            <small>Commercial workspace for construction teams</small>
          </span>
        </button>
        <div className="nav-actions">
          <button className="nav-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to home
          </button>
          {onLogin && (
            <button className="nav-login-btn" onClick={onLogin}>
              Log in
            </button>
          )}
        </div>
      </nav>

      <main className="pricing-main">
        <section className="pricing-hero-section">
          <div className="pricing-hero-copy">
            <div className="section-kicker">
              <Sparkles size={14} />
              Nigerian construction pricing, simplified
            </div>
            <h1>
              Plans built for
              <span> Nigerian QS professionals.</span>
            </h1>
            <p className="pricing-subtitle">
              From student QS in Lagos to estimating teams in Abuja and full-scale firms across Nigeria —
              every plan includes the same BOQ engine, regional benchmarks, and NGN-native billing.
            </p>

            {displayError && (
              <div className="pricing-error-banner">
                <span className="error-icon">!</span>
                <span>{displayError}</span>
              </div>
            )}

            <div className="pricing-hero-actions">
              <button className="hero-cta-primary" onClick={() => scrollToSection(plansRef)}>
                See plan options
                <ArrowRight size={18} />
              </button>
              <button className="hero-cta-secondary" onClick={() => scrollToSection(comparisonRef, true)}>
                Compare features
              </button>
            </div>

            <div className="billing-panel">
              <div className="billing-copy">
                <span>Billing preference</span>
                <strong>{billing === 'annual' ? 'Annual billing with savings' : 'Monthly billing flexibility'}</strong>
              </div>
              <div className="billing-toggle">
                <button
                  className={`toggle-btn ${billing === 'monthly' ? 'active' : ''}`}
                  onClick={() => setBilling('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`toggle-btn ${billing === 'annual' ? 'active' : ''}`}
                  onClick={() => setBilling('annual')}
                >
                  Annual
                  <span className="savings-badge">Save {savingsPercent}%</span>
                </button>
              </div>
            </div>

            <div className="hero-stats">
              <div className="hero-stat-card">
                <strong>6 tiers</strong>
                <span>From student to enterprise rollout</span>
              </div>
              <div className="hero-stat-card">
                <strong>17%</strong>
                <span>Typical annual savings</span>
              </div>
              <div className="hero-stat-card">
                <strong>1 workspace</strong>
                <span>Same BOQ engine across every plan</span>
              </div>
            </div>

            <div className="trust-strip">
              {TRUST_SIGNALS.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
          </div>

          <div className="pricing-hero-visual">
            <div className="preview-card preview-card-main">
              <div className="preview-card-head">
                <div>
                  <span className="preview-tag">Plan guide</span>
                  <h2>How teams usually grow with BOQ Pro</h2>
                </div>
                <span className="preview-mode">
                  <Sparkles size={14} />
                  {billing === 'annual' ? 'Annual view' : 'Monthly view'}
                </span>
              </div>

              <div className="preview-badges">
                <span><Layers3 size={14} /> Benchmark + custom pricing</span>
                <span><BarChart3 size={14} /> Reports and exports included</span>
                <span><Shield size={14} /> Secure billing flow</span>
              </div>

              <div className="preview-plan-list">
                {previewPlans.map((planName) => {
                  const plan = PLANS[planName];
                  const price = billing === 'annual' ? plan.displayAnnual : plan.displayMonthly;
                  const period = plan.priceMonthly === 0 ? '' : billing === 'annual' ? '/year' : '/month';
                  const Icon = PLAN_ICONS[planName];
                  return (
                    <div key={planName} className="preview-plan-row">
                      <div>
                        <strong>{plan.label}</strong>
                        <small>{plan.tagline}</small>
                      </div>
                      <div className="preview-plan-meta">
                        <strong>{price}{period}</strong>
                        <span className={`preview-pill state-${PLAN_TONES[planName]}`}>
                          <Icon size={12} />
                          {plan.popular ? 'Recommended' : plan.maxUsers > 1 ? 'Team' : 'Solo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="preview-activity">
                <div className="preview-activity-title">
                  <CheckCircle2 size={15} />
                  What Professional unlocks
                </div>
                {PLANS[PLAN_NAMES.PROFESSIONAL].featureLabels.slice(0, 4).map((item) => (
                  <div key={item} className="preview-activity-row">
                    <CheckCircle2 size={14} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-card preview-card-side">
              <span className="preview-tag">Recommended lane</span>
              <h3>{PLANS[PLAN_NAMES.PROFESSIONAL].label}</h3>
              <div className="side-metric">
                <span>Best fit for</span>
                <strong>Live QS and estimating work</strong>
              </div>
              <div className="side-metric">
                <span>{billing === 'annual' ? 'Annual price' : 'Monthly price'}</span>
                <strong>{billing === 'annual' ? PLANS[PLAN_NAMES.PROFESSIONAL].displayAnnual : PLANS[PLAN_NAMES.PROFESSIONAL].displayMonthly}</strong>
              </div>
              <div className="side-metric">
                <span>Billing note</span>
                <strong>{billing === 'annual' ? `NGN ${Math.round((PLANS[PLAN_NAMES.PROFESSIONAL].priceAnnual / 100) / 12).toLocaleString()}/mo billed annually` : 'Change plans when needed'}</strong>
              </div>
              <button className="preview-side-action" onClick={() => scrollToSection(plansRef)}>
                View plan cards
              </button>
            </div>
          </div>
        </section>

        <section className="value-card-grid">
          {VALUE_CARDS.map(({ icon, title, copy }) => (
            <article key={title} className="value-card">
              <div className="value-card-icon">
                {React.createElement(icon, { size: 18 })}
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        <section className="plans-shell" ref={plansRef}>
          <div className="plans-heading">
            <span className="section-kicker">Plan options</span>
            <h2>Pick the tier that matches how your firm prices today.</h2>
            <p>
              From student QS in Lagos to enterprise firms across Nigeria — every plan includes the same BOQ engine,
              regional benchmarks, and NGN-native billing through Paystack.
            </p>
          </div>

          <div className="pricing-cards">
          {PLAN_TIER_ORDER.map((planName) => {
            const plan = PLANS[planName];
            const Icon = PLAN_ICONS[planName];
            const tone = PLAN_TONES[planName];
            const price = billing === 'annual' ? plan.displayAnnual : plan.displayMonthly;
            const period = plan.priceMonthly === 0 ? '' : billing === 'annual' ? '/year' : '/month';
            const isEnterprise = planName === PLAN_NAMES.ENTERPRISE;
            const checkoutSupport = getPaystackCheckoutSupport(planName, billing);
            const showCheckoutWarning = !isEnterprise && isPaidPlan(planName) && !checkoutSupport.supported;

            return (
              <article
                key={planName}
                className={`plan-card tone-${tone} ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && <div className="popular-ribbon">Most Popular</div>}

                <div className="plan-top-row">
                  <div className="plan-icon-container">
                    <Icon size={22} />
                  </div>
                  <span className="plan-seat-pill">
                    {Number.isFinite(plan.maxUsers) ? `${plan.maxUsers} user${plan.maxUsers > 1 ? 's' : ''}` : 'Unlimited users'}
                  </span>
                </div>

                <h3 className="plan-name">{plan.label}</h3>
                <p className="plan-tagline">{plan.tagline}</p>

                <div className="price-display">
                  <strong>{price}</strong>
                  {period && <span>{period}</span>}
                </div>

                {billing === 'annual' && plan.priceMonthly > 0 && plan.priceAnnual && (
                  <div className="annual-note">
                    That's ₦{((plan.priceAnnual / 100) / 12).toLocaleString()}/mo
                  </div>
                )}

                <p className="plan-desc">{plan.description}</p>

                {showCheckoutWarning && (
                  <div className="plan-checkout-warning">
                    {checkoutSupport.reason}
                  </div>
                )}

                <div className="feature-list">
                  {plan.featureLabels.map((feature) => (
                    <div key={feature} className="feature-row">
                      <div className="check-icon">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {isEnterprise ? (
                  <div className="enterprise-actions">
                    <a href={`mailto:${plan.contactEmail}`} className="plan-cta plan-cta-outline">
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
                    className={`plan-cta ${plan.popular ? 'plan-cta-primary' : 'plan-cta-secondary'} ${loadingPlan === planName ? 'loading' : ''}`}
                    onClick={() => handleSelect(planName)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === planName ? (
                      <span className="cta-loading">
                        <span className="cta-spinner" />
                        Processing...
                      </span>
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                )}
              </article>
            );
          })}
          </div>
        </section>

        <section className="comparison-toggle-section" ref={comparisonRef}>
          <button
            className="comparison-toggle-btn"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? 'Hide' : 'Show'} full feature comparison
            <ArrowRight size={16} className={`toggle-arrow ${showComparison ? 'rotated' : ''}`} />
          </button>
        </section>

        {showComparison && (
          <section className="comparison-section view-fade-in">
            <div className="plans-heading comparison-heading">
              <span className="section-kicker">Comparison table</span>
              <h2>See exactly what each Nigerian QS tier includes.</h2>
              <p>
                From student access to enterprise rollout — compare features across all six plans to find the right fit for your firm.
              </p>
            </div>
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th className="feature-col">Feature</th>
                    {PLAN_TIER_ORDER.map((name) => (
                      <th key={name} className={PLANS[name].popular ? 'highlight-col' : ''}>
                        {PLANS[name].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map(({ feature, ...planValues }) => (
                    <tr key={feature}>
                      <td className="feature-col">{feature}</td>
                      {['student', 'starter', 'professional', 'business', 'corporate', 'enterprise'].map((planId) => {
                        const val = planValues[planId];
                        return (
                          <td key={planId} className={planId === 'professional' ? 'highlight-col' : ''}>
                            {val === true ? (
                              <span className="check-cell"><Check size={16} strokeWidth={3} /></span>
                            ) : val === false ? (
                              <span className="x-cell"><X size={14} /></span>
                            ) : (
                              <span className="text-cell">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="closing-cta">
          <div>
            <span className="section-kicker">Ready to move?</span>
            <h2>Start with the plan that matches your firm and grow inside the same Nigerian construction workspace.</h2>
            <p>
              From student QS in Lagos to enterprise firms across Nigeria — every plan includes the same BOQ engine,
              regional benchmarks, and NGN-native billing through Paystack.
            </p>
          </div>
          <div className="closing-actions">
            <button className="hero-cta-primary" onClick={() => scrollToSection(plansRef)}>
              Review plans
              <ArrowRight size={18} />
            </button>
            <button className="hero-cta-secondary" onClick={onLogin || onBack}>
              {onLogin ? 'Open existing account' : 'Back home'}
            </button>
          </div>
        </section>

        <section className="security-footer">
          <Shield size={16} />
          <span>
            Payments are securely processed by <strong>Paystack</strong>.
            Your card details never touch our servers. Protected by 256-bit SSL encryption.
          </span>
        </section>
      </main>

      <div className="mobile-cta-dock">
        <button className="mobile-dock-btn mobile-dock-btn-secondary" onClick={() => scrollToSection(comparisonRef, true)}>
          Compare
        </button>
        <button className="mobile-dock-btn mobile-dock-btn-primary" onClick={() => scrollToSection(plansRef)}>
          See plans
        </button>
      </div>

      <style jsx="true">{`
        /* ═══════════════════════════════════════════════
           PRICING PAGE — PREMIUM DARK-LIGHT HYBRID
           ═══════════════════════════════════════════════ */

        .pricing-shell {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background:
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.09), transparent 30%),
            radial-gradient(circle at 88% 16%, rgba(5, 150, 105, 0.08), transparent 22%),
            linear-gradient(180deg, #ffffff 0%, #f0fdf4 54%, #ecfdf5 100%);
          color: var(--primary-900);
          font-family: var(--font-main);
        }

        .pricing-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(52, 211, 153, 0.18), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(16, 185, 129, 0.12), transparent 18%);
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
          width: min(1320px, calc(100% - 2rem));
          margin: 0 auto;
        }

        /* ── Nav ── */
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
          box-shadow: 0 18px 35px rgba(16, 185, 129, 0.24);
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

        .nav-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.8rem;
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

        .nav-login-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 999px;
          padding: 0.78rem 1.1rem;
          background: var(--primary-900);
          color: white;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .nav-login-btn:hover,
        .hero-cta-primary:hover,
        .hero-cta-secondary:hover,
        .preview-side-action:hover,
        .mobile-dock-btn:hover {
          transform: translateY(-2px);
        }

        .pricing-main {
          padding: 2rem 0 4rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        /* ── Hero Section ── */
        .pricing-hero-section {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
          gap: 1.35rem;
          align-items: stretch;
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
          padding: 0.55rem 0.9rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.16);
          color: var(--accent-600);
          box-shadow: 0 8px 18px rgba(16, 185, 129, 0.08);
        }

        .pricing-hero-copy {
          text-align: left;
          padding-top: 0.3rem;
        }

        .pricing-hero-section h1 {
          margin: 1.25rem 0 1rem;
          font-size: clamp(3rem, 7vw, 5rem);
          line-height: 0.94;
          letter-spacing: -0.06em;
          color: var(--primary-950);
          max-width: 10.4ch;
        }

        .pricing-hero-section h1 span {
          display: block;
          color: var(--accent-600);
        }

        .pricing-subtitle {
          max-width: 680px;
          margin: 0;
          color: var(--primary-600);
          font-size: 1rem;
          line-height: 1.75;
        }

        .pricing-error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.4rem;
          max-width: 640px;
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

        /* ── Billing Toggle ── */
        .pricing-hero-actions,
        .closing-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-top: 1.5rem;
        }

        .hero-cta-primary,
        .hero-cta-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          border-radius: 18px;
          padding: 1rem 1.25rem;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 800;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .hero-cta-primary {
          background: linear-gradient(135deg, var(--primary-900), #059669);
          color: white;
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
        }

        .hero-cta-secondary {
          background: rgba(255, 255, 255, 0.86);
          color: var(--primary-700);
          border: 1px solid var(--border-medium);
        }

        .billing-panel {
          margin-top: 1.35rem;
          padding: 1rem;
          border-radius: 24px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .billing-copy {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .billing-copy span {
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary-500);
        }

        .billing-copy strong {
          color: var(--primary-900);
          font-size: 0.98rem;
        }

        .billing-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0;
          margin-top: 0;
          padding: 5px;
          border-radius: 999px;
          background: var(--primary-100);
          border: 1px solid var(--border-light);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
        }

        .toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.4rem;
          border-radius: 999px;
          border: none;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          background: transparent;
          color: var(--primary-600);
        }

        .toggle-btn.active {
          background: white;
          color: var(--primary-900);
          box-shadow: 0 4px 14px rgba(0,0,0,0.08);
        }

        .savings-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 800;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 1.5rem;
        }

        .hero-stat-card {
          padding: 1rem;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(203, 213, 225, 0.72);
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.05);
        }

        .hero-stat-card strong {
          display: block;
          font-size: 1.46rem;
          letter-spacing: -0.04em;
        }

        .hero-stat-card span {
          display: block;
          margin-top: 0.35rem;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.5;
        }

        .trust-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.65rem;
          margin-top: 1rem;
        }

        .trust-strip span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 16px;
          padding: 0.85rem 0.95rem;
          background: rgba(248, 250, 252, 0.95);
          border: 1px solid rgba(203, 213, 225, 0.72);
          color: var(--primary-600);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .pricing-hero-visual {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 0.44fr);
          gap: 1rem;
          align-items: stretch;
        }

        .preview-card {
          border-radius: 30px;
          border: 1px solid rgba(203, 213, 225, 0.72);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 24px 46px rgba(15, 23, 42, 0.08);
        }

        .preview-card-main {
          padding: 1.45rem;
        }

        .preview-card-side {
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(236, 253, 245, 0.82));
        }

        .preview-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .preview-card-head h2,
        .plans-heading h2,
        .comparison-heading h2,
        .closing-cta h2 {
          margin: 0.65rem 0 0;
          color: var(--primary-950);
          letter-spacing: -0.04em;
        }

        .preview-card-head h2 {
          font-size: 1.38rem;
          line-height: 1.12;
        }

        .preview-mode,
        .preview-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          padding: 0.5rem 0.75rem;
          font-size: 0.74rem;
          font-weight: 800;
        }

        .preview-mode {
          background: var(--primary-50);
          color: var(--primary-700);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .preview-badges {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.65rem;
          margin-top: 1rem;
        }

        .preview-badges span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border-radius: 16px;
          padding: 0.8rem 0.7rem;
          background: rgba(248, 250, 252, 0.96);
          border: 1px solid var(--border-light);
          color: var(--primary-600);
          font-size: 0.76rem;
          font-weight: 700;
          text-align: center;
        }

        .preview-plan-list {
          margin-top: 1rem;
          display: grid;
          gap: 0.85rem;
        }

        .preview-plan-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.95rem 1rem;
          border-radius: 20px;
          background: white;
          border: 1px solid var(--border-light);
        }

        .preview-plan-row strong {
          display: block;
          color: var(--primary-900);
        }

        .preview-plan-row small {
          display: block;
          margin-top: 0.2rem;
          color: var(--primary-500);
          font-size: 0.78rem;
          line-height: 1.45;
        }

        .preview-plan-meta {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .preview-pill {
          background: rgba(16, 185, 129, 0.08);
          color: var(--accent-600);
        }

        .preview-pill.state-student {
          background: rgba(15, 23, 42, 0.06);
          color: var(--primary-800);
        }

        .preview-pill.state-starter {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .preview-pill.state-business {
          background: rgba(124, 58, 237, 0.1);
          color: #7c3aed;
        }

        .preview-activity {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
          color: white;
        }

        .preview-activity-title {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.72);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .preview-activity-row {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          margin-top: 0.85rem;
          font-size: 0.84rem;
          line-height: 1.55;
        }

        .preview-card-side h3 {
          margin: 0;
          font-size: 1.42rem;
          color: var(--primary-950);
        }

        .side-metric {
          padding: 0.95rem;
          border-radius: 20px;
          background: white;
          border: 1px solid var(--border-light);
        }

        .side-metric span {
          display: block;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--primary-500);
        }

        .side-metric strong {
          display: block;
          margin-top: 0.4rem;
          color: var(--primary-900);
          font-size: 0.95rem;
          line-height: 1.45;
        }

        .preview-side-action {
          margin-top: auto;
          border: none;
          border-radius: 18px;
          background: var(--primary-900);
          color: white;
          padding: 0.95rem 1rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 16px 28px rgba(15, 23, 42, 0.16);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .value-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .value-card {
          padding: 1.35rem;
          border-radius: 24px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
        }

        .value-card-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }

        .value-card h3 {
          margin: 1rem 0 0.45rem;
          font-size: 1rem;
          color: var(--primary-950);
        }

        .value-card p,
        .plans-heading p,
        .comparison-heading p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.65;
        }

        .plans-shell {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .plans-heading,
        .comparison-heading {
          max-width: 760px;
        }

        .plans-heading h2 {
          margin: 1rem 0 0.7rem;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.06;
        }

        /* ── Plan Cards Grid ── */
        .pricing-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .plan-card {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid var(--border-light);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          position: relative;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          overflow: hidden;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.08);
        }

        .plan-card.popular {
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 18px 44px rgba(16, 185, 129, 0.14);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,253,245,0.6) 100%);
        }

        .popular-ribbon {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          text-align: center;
          padding: 0.38rem 0;
          background: linear-gradient(135deg, var(--primary-900), var(--accent-600));
          color: white;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .plan-card.popular .plan-top-row {
          margin-top: 1.2rem;
        }

        /* ── Plan Card Tone Colors ── */
        .tone-student .plan-icon-container { background: rgba(15, 23, 42, 0.06); color: var(--primary-800); }
        .tone-starter .plan-icon-container { background: rgba(16, 185, 129, 0.1); color: #059669; }
        .tone-professional .plan-icon-container { background: rgba(16, 185, 129, 0.1); color: var(--accent-600); }
        .tone-business .plan-icon-container { background: rgba(124, 58, 237, 0.1); color: #7c3aed; }
        .tone-corporate .plan-icon-container { background: rgba(217, 119, 6, 0.1); color: #b45309; }
        .tone-enterprise .plan-icon-container { background: rgba(15, 23, 42, 0.08); color: var(--primary-700); }

        .plan-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .plan-seat-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border-radius: 999px;
          padding: 0.5rem 0.75rem;
          font-size: 0.74rem;
          font-weight: 800;
          background: var(--primary-50);
          color: var(--primary-700);
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .plan-icon-container {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }

        .plan-name {
          margin: 0.85rem 0 0.2rem;
          font-size: 1.2rem;
          color: var(--primary-950);
        }

        .plan-tagline {
          margin: 0;
          color: var(--primary-500);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .price-display {
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
          margin: 1rem 0 0.25rem;
        }

        .price-display strong {
          font-size: 1.85rem;
          font-weight: 900;
          color: var(--primary-950);
          letter-spacing: -0.04em;
        }

        .price-display span {
          color: var(--primary-500);
          font-size: 0.85rem;
          font-weight: 700;
        }

        .annual-note {
          font-size: 0.75rem;
          color: #059669;
          font-weight: 700;
          margin-bottom: 0.4rem;
        }

        .plan-desc {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.82rem;
          line-height: 1.65;
        }

        .plan-checkout-warning {
          margin-top: 0.85rem;
          padding: 0.8rem 0.9rem;
          border-radius: 14px;
          background: #fff7ed;
          border: 1px solid #fdba74;
          color: #9a3412;
          font-size: 0.76rem;
          line-height: 1.5;
          font-weight: 700;
        }

        .feature-list {
          display: grid;
          gap: 0.62rem;
          margin: 1.15rem 0;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
          flex: 1;
        }

        .feature-row {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          color: var(--primary-700);
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .check-icon {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ── CTA Buttons ── */
        .plan-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          width: 100%;
          margin-top: auto;
          padding: 0.85rem 1rem;
          border-radius: 14px;
          border: 1px solid transparent;
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .plan-cta:hover { transform: translateY(-2px); }

        .plan-cta-primary {
          background: linear-gradient(135deg, var(--primary-900), #059669);
          color: white;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
        }

        .plan-cta-primary:hover {
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.25);
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

        .plan-cta-outline {
          background: transparent;
          color: var(--primary-800);
          border-color: var(--border-medium);
        }

        .plan-cta-outline:hover {
          background: var(--primary-50);
        }

        .plan-cta.loading {
          pointer-events: none;
          opacity: 0.75;
        }

        .cta-loading {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cta-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .plan-cta-secondary .cta-spinner {
          border-color: rgba(15,23,42,0.15);
          border-top-color: var(--primary-700);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .enterprise-actions {
          margin-top: auto;
        }

        .enterprise-contact-meta {
          display: grid;
          gap: 0.35rem;
          margin-top: 0.75rem;
          color: var(--primary-600);
          font-size: 0.78rem;
        }

        .enterprise-contact-meta span {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        /* ── Feature Comparison Section ── */
        .comparison-toggle-section {
          text-align: center;
          margin-top: 2.5rem;
        }

        .comparison-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.6rem;
          border-radius: 999px;
          border: 1px solid var(--border-medium);
          background: white;
          color: var(--primary-700);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .comparison-toggle-btn:hover {
          background: var(--primary-50);
          border-color: var(--primary-400);
          transform: translateY(-2px);
        }

        .toggle-arrow {
          transition: transform 0.3s ease;
        }

        .toggle-arrow.rotated {
          transform: rotate(90deg);
        }

        .comparison-section {
          margin-top: 2rem;
        }

        .comparison-section h2 {
          font-size: 1.5rem;
          color: var(--primary-950);
          margin-bottom: 1.25rem;
        }

        .comparison-table-wrapper {
          overflow-x: auto;
          border-radius: 20px;
          border: 1px solid var(--border-light);
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          font-size: 0.82rem;
          min-width: 900px;
        }

        .comparison-table thead {
          background: var(--primary-50);
        }

        .comparison-table th {
          padding: 1rem 0.8rem;
          text-align: center;
          font-weight: 800;
          color: var(--primary-800);
          font-size: 0.8rem;
          border-bottom: 2px solid var(--border-light);
          white-space: nowrap;
        }

        .comparison-table th.feature-col {
          text-align: left;
          min-width: 180px;
        }

        .comparison-table th.highlight-col {
          background: rgba(16, 185, 129, 0.08);
          color: var(--accent-600);
        }

        .comparison-table td {
          padding: 0.75rem 0.8rem;
          text-align: center;
          border-bottom: 1px solid var(--border-light);
          color: var(--primary-700);
        }

        .comparison-table td.feature-col {
          text-align: left;
          font-weight: 600;
          color: var(--primary-800);
        }

        .comparison-table td.highlight-col {
          background: rgba(16, 185, 129, 0.03);
        }

        .comparison-table tbody tr:hover {
          background: rgba(16, 185, 129, 0.02);
        }

        .check-cell {
          color: #16a34a;
          display: inline-flex;
        }

        .x-cell {
          color: var(--primary-300);
          display: inline-flex;
        }

        .text-cell {
          font-weight: 600;
          color: var(--primary-700);
        }

        /* ── Security Footer ── */
        .security-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          margin-top: 3rem;
          padding: 1.2rem;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border-light);
          color: var(--primary-600);
          font-size: 0.82rem;
          text-align: center;
        }

        .security-footer strong {
          color: var(--primary-900);
        }

        .closing-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.4rem;
          padding: 1.4rem;
          border-radius: 30px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
        }

        .closing-cta p {
          margin-top: 0.7rem;
          max-width: 720px;
        }

        .mobile-cta-dock {
          display: none;
        }

        .mobile-dock-btn {
          border: none;
          border-radius: 18px;
          padding: 0.95rem 1rem;
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .mobile-dock-btn-primary {
          background: var(--primary-900);
          color: white;
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.18);
        }

        .mobile-dock-btn-secondary {
          background: white;
          color: var(--primary-700);
          border: 1px solid var(--border-medium);
        }

        /* ═══════════════════════════════════════
           RESPONSIVE BREAKPOINTS
           ═══════════════════════════════════════ */

        /* 6-column → 3-column */
        @media (min-width: 1081px) {
          .pricing-cards {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        /* 2-column for tablet */
        @media (max-width: 1080px) {
          .pricing-hero-section,
          .value-card-grid {
            grid-template-columns: 1fr;
          }

          .pricing-hero-visual {
            grid-template-columns: 1fr;
          }

          .pricing-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .pricing-nav {
            gap: 1rem;
            align-items: flex-start;
            flex-direction: column;
          }

          .nav-actions {
            width: 100%;
            justify-content: space-between;
          }

          .pricing-hero-section h1 {
            font-size: clamp(2rem, 8vw, 3rem);
          }

          .hero-stats,
          .trust-strip,
          .preview-badges {
            grid-template-columns: 1fr;
          }

          .billing-panel,
          .closing-cta {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* 1-column for mobile */
        @media (max-width: 640px) {
          .pricing-nav,
          .pricing-main {
            width: min(1320px, calc(100% - 1.25rem));
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

          .pricing-cards {
            grid-template-columns: 1fr;
          }

          .value-card-grid {
            grid-template-columns: 1fr;
          }

          .plan-card,
          .comparison-table-wrapper,
          .preview-card,
          .value-card,
          .closing-cta {
            border-radius: 20px;
          }

          .plan-card {
            padding: 1.15rem;
          }

          .price-display strong {
            font-size: 1.65rem;
          }

          .billing-toggle {
            flex-direction: column;
            border-radius: 16px;
            padding: 4px;
          }

          .toggle-btn {
            width: 100%;
            justify-content: center;
          }

          .section-kicker,
          .preview-tag {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .mobile-cta-dock {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            position: sticky;
            bottom: 0;
            z-index: 25;
            padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
            background: linear-gradient(180deg, rgba(248, 250, 252, 0), rgba(248, 250, 252, 0.96) 35%);
            backdrop-filter: blur(8px);
          }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
