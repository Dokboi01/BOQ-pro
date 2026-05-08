import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Mail,
  Phone,
  Shield,
  Sparkles,
  User
} from 'lucide-react';

const SignUp = ({ error, selectedPlan, onSignUp, onSwitchToLogin, onViewTerms, onViewPrivacy }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const signupBenefits = [
    {
      icon: <Building2 size={18} />,
      title: 'Company workspace from day one',
      copy: 'Create the account around a company identity so projects, pricing, and exports stay tied to one workflow.'
    },
    {
      icon: <FileSpreadsheet size={18} />,
      title: 'Real BOQ flow immediately',
      copy: 'Start with the same benchmark-first, custom-pricing-ready workspace you saw on the welcome and pricing pages.'
    },
    {
      icon: <CheckCircle2 size={18} />,
      title: 'Ready for rollout later',
      copy: 'Begin with one user and grow into a team setup without changing the product or retraining around a new interface.'
    }
  ];

  const quickSignals = [
    selectedPlan ? `${selectedPlan} selected` : 'Pick a plan anytime',
    'Company email onboarding',
    'Benchmark + custom pricing',
    'Cloud-backed project sync'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await onSignUp(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-atmosphere" />
      <div className="auth-grid-overlay" />

      <nav className="auth-nav">
        <button className="brand-mark" onClick={() => onSwitchToLogin('landing')}>
          <span className="brand-icon">
            <Shield size={18} />
          </span>
          <span className="brand-copy">
            <strong>Quantra</strong>
            <small>Commercial workspace for construction teams</small>
          </span>
        </button>

        <div className="nav-actions">
          <button className="nav-back-btn" onClick={() => onSwitchToLogin('pricing')}>
            <ArrowLeft size={16} />
            {selectedPlan ? 'Back to pricing' : 'Back to home'}
          </button>
          <button className="nav-create-btn" onClick={() => onSwitchToLogin('login')}>
            Sign in
          </button>
        </div>
      </nav>

      <main className="auth-main">
        <section className="auth-story">
          <div className="section-kicker">
            <Sparkles size={14} />
            Create your BOQ workspace
          </div>

          <h1>
            Start the company setup
            <span> the same way the product already feels.</span>
          </h1>

          <p className="auth-subtitle">
            The signup screen now follows the same visual direction as the landing, pricing, and login pages:
            lighter, more product-aware, and built around how Quantra is actually used by QS teams and contractors.
          </p>

          <div className="signal-strip">
            {quickSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>

          <div className="story-preview">
            <span className="preview-tag">What you are creating</span>
            <h2>New Quantra company workspace</h2>

            <div className="story-preview-grid">
              <div className="story-stat-card">
                <strong>Benchmark pricing</strong>
                <span>Start from market-backed BOQ automation</span>
              </div>
              <div className="story-stat-card">
                <strong>Custom rate build-up</strong>
                <span>Go deeper when benchmark is not enough</span>
              </div>
              <div className="story-stat-card">
                <strong>Exports + sync</strong>
                <span>Keep the same job through review and handoff</span>
              </div>
            </div>
          </div>

          <div className="benefit-grid">
            {signupBenefits.map(({ icon, title, copy }) => (
              <article key={title} className="benefit-card">
                <div className="benefit-icon">{icon}</div>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="auth-panel-wrap">
          <div className="auth-panel">
            <div className="auth-card-header">
              <h2>Create your account</h2>
              <p>Set up the company account that will own your Quantrajects, pricing workflow, and exports.</p>
            </div>

            {selectedPlan && (
              <div className="selected-plan-summary">
                <div className="plan-info">
                  <span className="label">Selected plan</span>
                  <span className="plan-name">{selectedPlan}</span>
                </div>
                <button className="change-link" onClick={() => onSwitchToLogin('pricing')}>
                  Change
                </button>
              </div>
            )}

            {(error || localError) && (
              <div className="auth-error-banner">
                <AlertCircle size={18} />
                <span>{error || localError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Full name</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Professional email</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company / institution</label>
                  <div className="input-with-icon">
                    <Building2 size={18} className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="BuildPro Ltd"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+234..."
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Repeat your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={formData.agreeToTerms}
                  onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                />
                <label htmlFor="terms">
                  I agree to the <button type="button" className="text-link" onClick={(e) => { e.preventDefault(); onViewTerms?.(); }}>Terms of Service</button> and <button type="button" className="text-link" onClick={(e) => { e.preventDefault(); onViewPrivacy?.(); }}>Privacy Policy</button>
                </label>
              </div>

              <button type="submit" className={`auth-submit ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create your Quantra account'}
                {!isLoading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="auth-note">
              <CheckCircle2 size={16} />
              <span>Best experience: use the company email identity your team will use for shared projects and pricing rollout.</span>
            </div>

            <div className="auth-footer">
              <span>Already have a Quantra account?</span>
              <button className="text-link text-link-strong" onClick={() => onSwitchToLogin('login')}>
                Sign in
              </button>
            </div>
          </div>
        </section>
      </main>

      <style jsx="true">{`
        .auth-shell {
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

        .auth-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(96, 165, 250, 0.18), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(251, 191, 36, 0.12), transparent 18%);
          pointer-events: none;
        }

        .auth-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(203, 213, 225, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.4) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 92%);
          pointer-events: none;
        }

        .auth-nav,
        .auth-main {
          position: relative;
          z-index: 2;
          width: min(1220px, calc(100% - 2rem));
          margin: 0 auto;
        }

        .auth-nav {
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

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-back-btn,
        .nav-create-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border-radius: 999px;
          padding: 0.75rem 1rem;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .nav-back-btn {
          border: 1px solid var(--border-medium);
          background: rgba(255, 255, 255, 0.78);
          color: var(--primary-700);
        }

        .nav-create-btn {
          border: none;
          background: var(--primary-900);
          color: white;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.14);
        }

        .nav-back-btn:hover,
        .nav-create-btn:hover,
        .auth-submit:hover,
        .text-link-strong:hover {
          transform: translateY(-1px);
        }

        .auth-main {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(420px, 0.96fr);
          gap: 2rem;
          align-items: start;
          padding: 2rem 0 4rem;
        }

        .auth-story {
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

        .auth-story h1 {
          margin: 1.25rem 0 1rem;
          font-size: clamp(2.8rem, 7vw, 4.8rem);
          line-height: 0.96;
          letter-spacing: -0.05em;
          color: var(--primary-950);
          max-width: 10.5ch;
        }

        .auth-story h1 span {
          display: block;
          color: var(--accent-600);
        }

        .auth-subtitle {
          max-width: 700px;
          margin: 0;
          color: var(--primary-600);
          font-size: 1.02rem;
          line-height: 1.75;
        }

        .signal-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 1.4rem;
        }

        .signal-strip span {
          padding: 0.46rem 0.72rem;
          border-radius: 999px;
          background: white;
          border: 1px solid var(--border-light);
          color: var(--primary-700);
          font-size: 0.74rem;
          font-weight: 700;
          box-shadow: var(--shadow-sm);
        }

        .story-preview {
          margin-top: 1.6rem;
          padding: 1.3rem;
          border-radius: 28px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(14px);
        }

        .preview-tag {
          padding: 0.42rem 0.75rem;
          background: rgba(15, 23, 42, 0.06);
          color: var(--primary-700);
        }

        .story-preview h2 {
          margin: 1rem 0 1.15rem;
          font-size: 1.35rem;
          color: var(--primary-950);
        }

        .story-preview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .story-stat-card {
          padding: 1rem;
          border-radius: 20px;
          background: white;
          border: 1px solid rgba(203, 213, 225, 0.72);
        }

        .story-stat-card strong {
          display: block;
          font-size: 0.98rem;
          color: var(--primary-900);
        }

        .story-stat-card span {
          display: block;
          margin-top: 0.45rem;
          color: var(--primary-500);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .benefit-grid {
          display: grid;
          gap: 0.9rem;
          margin-top: 1.25rem;
        }

        .benefit-card {
          display: flex;
          gap: 0.85rem;
          padding: 1rem 1.05rem;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(203, 213, 225, 0.72);
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.05);
        }

        .benefit-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }

        .benefit-card h3 {
          margin: 0;
          font-size: 0.96rem;
          color: var(--primary-950);
        }

        .benefit-card p {
          margin: 0.35rem 0 0;
          color: var(--primary-600);
          font-size: 0.83rem;
          line-height: 1.65;
        }

        .auth-panel-wrap {
          position: sticky;
          top: 1.5rem;
        }

        .auth-panel {
          padding: 1.6rem;
          border-radius: 30px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 22px 46px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(14px);
        }

        .auth-card-header h2 {
          margin: 0;
          font-size: 1.7rem;
          color: var(--primary-950);
        }

        .auth-card-header p {
          margin: 0.55rem 0 0;
          color: var(--primary-500);
          line-height: 1.7;
          font-size: 0.9rem;
        }

        .selected-plan-summary {
          margin-top: 1.2rem;
          padding: 1rem 1.1rem;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(248, 250, 252, 0.96));
          border: 1px solid rgba(37, 99, 235, 0.12);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .plan-info {
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
        }

        .plan-info .label {
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--primary-500);
          letter-spacing: 0.08em;
        }

        .plan-info .plan-name {
          font-size: 1rem;
          font-weight: 800;
          color: var(--primary-900);
        }

        .change-link {
          border: none;
          background: transparent;
          color: var(--accent-600);
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .auth-error-banner,
        .auth-note {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          margin-top: 1rem;
          padding: 0.9rem 1rem;
          border-radius: 18px;
          font-size: 0.88rem;
          line-height: 1.55;
        }

        .auth-error-banner {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.25);
          color: #dc2626;
        }

        .auth-note {
          background: rgba(15, 118, 110, 0.08);
          border: 1px solid rgba(20, 184, 166, 0.16);
          color: #0f766e;
        }

        .auth-form {
          display: grid;
          gap: 1rem;
          margin-top: 1.2rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .form-label {
          font-size: 0.73rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary-600);
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--primary-400);
        }

        .form-input {
          width: 100%;
          border-radius: 16px;
          border: 1px solid var(--border-medium);
          background: rgba(248, 250, 252, 0.96);
          color: var(--primary-900);
          font-size: 0.92rem;
          padding: 0.92rem 1rem 0.92rem 2.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-500);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
          background: white;
        }

        .form-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-top: 0.15rem;
          color: var(--primary-600);
          font-size: 0.86rem;
          line-height: 1.55;
        }

        .form-checkbox input {
          margin-top: 0.25rem;
        }

        .auth-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          width: 100%;
          margin-top: 0.2rem;
          padding: 1rem 1.2rem;
          border-radius: 18px;
          border: none;
          background: linear-gradient(135deg, var(--primary-900), #1e3a5f);
          color: white;
          font-size: 0.96rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .auth-submit.loading {
          opacity: 0.8;
          pointer-events: none;
        }

        .auth-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
          color: var(--primary-500);
          font-size: 0.88rem;
        }

        .text-link {
          border: none;
          background: transparent;
          color: var(--accent-600);
          font-size: inherit;
          font-weight: 600;
          padding: 0;
          cursor: pointer;
        }

        .text-link:hover {
          text-decoration: underline;
        }

        .text-link-strong {
          font-weight: 800;
        }

        @media (max-width: 1080px) {
          .auth-main {
            grid-template-columns: 1fr;
          }

          .auth-panel-wrap {
            position: static;
          }
        }

        @media (max-width: 820px) {
          .auth-nav {
            gap: 1rem;
            align-items: flex-start;
            flex-direction: column;
          }

          .auth-story h1 {
            font-size: clamp(2.4rem, 10vw, 3.4rem);
          }

          .story-preview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .auth-nav,
          .auth-main {
            width: min(1220px, calc(100% - 1.25rem));
          }

          .auth-nav {
            position: sticky;
            top: 0;
            z-index: 20;
            padding: 0.9rem 0 0.8rem;
            background: rgba(248, 250, 252, 0.92);
            backdrop-filter: blur(14px);
            border-bottom: 1px solid rgba(203, 213, 225, 0.7);
          }

          .brand-copy small {
            display: none;
          }

          .nav-actions {
            width: 100%;
            justify-content: space-between;
          }

          .section-kicker {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .auth-story,
          .auth-main {
            padding-top: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .auth-panel,
          .story-preview,
          .benefit-card {
            border-radius: 22px;
          }

          .auth-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default SignUp;
