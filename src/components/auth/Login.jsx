import React, { useState } from 'react';
import {
  Shield,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  Calculator,
  FileSpreadsheet,
  CheckCircle2,
  ArrowLeft,
  Moon,
  SunMedium
} from 'lucide-react';

const Login = ({ error, onLogin, onSwitchToSignUp, onForgotPassword, onBack, resolvedTheme, onToggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginBenefits = [
    {
      icon: <Building2 size={18} />,
      title: 'Company access',
      copy: 'Keep your projects tied to one company workflow instead of scattered personal files.'
    },
    {
      icon: <Calculator size={18} />,
      title: 'Pricing workflow',
      copy: 'Open straight into quantity takeoff, benchmark pricing, and custom rate build-up.'
    },
    {
      icon: <FileSpreadsheet size={18} />,
      title: 'Submission-ready output',
      copy: 'Carry the same BOQ through review and exports without rebuilding it elsewhere.'
    }
  ];

  const quickSignals = [
    'Company email login',
    'Shared project sync',
    'Custom pricing studio',
    'Client-ready exports'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onLogin({ email, password });
    setIsLoading(false);
  };

  const handleGuestAccess = async () => {
    setIsLoading(true);
    await onLogin({ email: 'guest@boqpro.com', password: 'password' });
    setIsLoading(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-atmosphere" />
      <div className="auth-grid-overlay" />

      <nav className="auth-nav">
        <button className="brand-mark" onClick={onBack}>
          <span className="brand-icon">
            <Shield size={18} />
          </span>
          <span className="brand-copy">
            <strong>BOQ Pro</strong>
            <small>Commercial workspace for construction teams</small>
          </span>
        </button>

        <div className="nav-actions">
          <button className="theme-toggle-btn" onClick={onToggleTheme}>
            {resolvedTheme === 'dark' ? <SunMedium size={16} /> : <Moon size={16} />}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="nav-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to home
          </button>
          <button className="nav-create-btn" onClick={onSwitchToSignUp}>
            Create account
          </button>
        </div>
      </nav>

      <main className="auth-main">
        <section className="auth-story">
          <div className="section-kicker">
            <Sparkles size={14} />
            Sign in to your BOQ workspace
          </div>

          <h1>
            Pick up the project
            <span> exactly where your team left it.</span>
          </h1>

          <p className="auth-subtitle">
            The login page now follows the same spec as the upgraded base page: lighter, more
            product-aware, and focused on the actual company workflow behind BOQ Pro.
          </p>

          <div className="signal-strip">
            {quickSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>

          <div className="story-preview">
            <span className="preview-tag">Live workspace preview</span>
            <h2>Current commercial view</h2>

            <div className="story-preview-grid">
              <div className="story-stat-card">
                <strong>7 sections</strong>
                <span>Active on the current BOQ</span>
              </div>
              <div className="story-stat-card">
                <strong>NGN 68.4M</strong>
                <span>Latest estimate in review</span>
              </div>
              <div className="story-stat-card">
                <strong>Custom + benchmark</strong>
                <span>Rate workflow preserved</span>
              </div>
            </div>
          </div>

          <div className="benefit-grid">
            {loginBenefits.map(({ icon, title, copy }) => (
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
              <h2>Welcome back</h2>
              <p>Sign in with the company email and password tied to your BOQ Pro workspace.</p>
            </div>

            {error && (
              <div className="auth-error-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Work email</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label className="form-label">Password</label>
                  <button type="button" className="text-link" onClick={onForgotPassword}>Forgot password?</button>
                </div>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={`auth-submit ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in to BOQ Pro'}
                {!isLoading && <ArrowRight size={18} />}
              </button>

              <button type="button" className="btn-guest-access" onClick={handleGuestAccess} disabled={isLoading}>
                Engineer guest access for quick testing
              </button>
            </form>

            <div className="auth-note">
              <CheckCircle2 size={16} />
              <span>Best experience: sign in with the same company identity your team uses for project rollout.</span>
            </div>

            <div className="auth-footer">
              <span>Need a new company workspace?</span>
              <button className="text-link text-link-strong" onClick={onSwitchToSignUp}>
                Create account
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
        .nav-create-btn:hover {
          transform: translateY(-1px);
        }

        .auth-main {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(380px, 0.96fr);
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
          padding: 0.42rem 0.72rem;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.14);
          color: var(--accent-600);
        }

        .story-preview h2 {
          margin: 0.9rem 0 1rem;
          font-size: 1.25rem;
          line-height: 1.2;
          color: var(--primary-950);
        }

        .story-preview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }

        .story-stat-card {
          padding: 0.95rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-light);
        }

        .story-stat-card strong {
          display: block;
          color: var(--primary-900);
          font-size: 0.92rem;
          font-weight: 800;
        }

        .story-stat-card span {
          display: block;
          margin-top: 0.3rem;
          color: var(--primary-500);
          font-size: 0.74rem;
          line-height: 1.5;
        }

        .benefit-grid {
          display: grid;
          gap: 0.9rem;
          margin-top: 1.4rem;
        }

        .benefit-card {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.9rem;
          align-items: start;
          padding: 1rem 1.05rem;
          border-radius: 22px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .benefit-icon {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }

        .benefit-card h3 {
          margin: 0 0 0.35rem;
          font-size: 0.98rem;
          color: var(--primary-950);
        }

        .benefit-card p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.65;
        }

        .auth-panel-wrap {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .auth-panel {
          width: 100%;
          max-width: 480px;
          padding: 1.6rem;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(14px);
        }

        .auth-card-header h2 {
          margin: 0;
          font-size: 1.55rem;
          color: var(--primary-950);
        }

        .auth-card-header p {
          margin: 0.55rem 0 0;
          color: var(--primary-600);
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .auth-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-top: 1.2rem;
          padding: 0.9rem 1rem;
          border-radius: 16px;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.25);
          color: #dc2626;
          font-size: 0.88rem;
          font-weight: 700;
          line-height: 1.5;
        }

        .auth-form {
          display: grid;
          gap: 1rem;
          margin-top: 1.35rem;
        }

        .form-group {
          display: grid;
          gap: 0.48rem;
        }

        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--primary-700);
          text-transform: uppercase;
          letter-spacing: 0.06em;
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
          min-height: 54px;
          padding: 0 1rem 0 3rem;
          border-radius: 16px;
          border: 1px solid var(--border-medium);
          background: white;
          color: var(--primary-900);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .form-input:focus {
          border-color: var(--accent-600);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
        }

        .text-link {
          background: none;
          border: none;
          padding: 0;
          color: var(--accent-600);
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }

        .text-link:hover {
          text-decoration: underline;
        }

        .auth-submit,
        .btn-guest-access {
          width: 100%;
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          border-radius: 16px;
          font-size: 0.94rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }

        .auth-submit {
          border: none;
          background: var(--primary-900);
          color: white;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.16);
        }

        .auth-submit:hover,
        .btn-guest-access:hover {
          transform: translateY(-2px);
        }

        .auth-submit.loading {
          pointer-events: none;
          opacity: 0.7;
        }

        .btn-guest-access {
          border: 1px dashed var(--accent-400);
          background: rgba(37, 99, 235, 0.05);
          color: var(--accent-600);
        }

        .btn-guest-access:hover {
          background: rgba(37, 99, 235, 0.08);
          border-color: var(--accent-600);
        }

        .btn-guest-access:disabled {
          pointer-events: none;
          opacity: 0.7;
        }

        .auth-note {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin-top: 1.1rem;
          padding: 0.95rem 1rem;
          border-radius: 18px;
          background: var(--primary-50);
          border: 1px solid rgba(203, 213, 225, 0.65);
          color: var(--primary-700);
          font-size: 0.84rem;
          line-height: 1.55;
        }

        .auth-note svg {
          flex-shrink: 0;
          margin-top: 0.1rem;
          color: var(--accent-600);
        }

        .auth-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1.2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-light);
          color: var(--primary-500);
          font-size: 0.88rem;
        }

        .text-link-strong {
          font-size: 0.88rem;
        }

        @media (max-width: 1080px) {
          .auth-main,
          .story-preview-grid {
            grid-template-columns: 1fr;
          }

          .auth-panel-wrap {
            justify-content: stretch;
          }

          .auth-panel {
            max-width: none;
          }
        }

        @media (max-width: 820px) {
          .auth-nav {
            gap: 1rem;
            align-items: flex-start;
            flex-direction: column;
          }

          .auth-story h1 {
            font-size: clamp(2.5rem, 12vw, 4rem);
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

          .nav-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .brand-copy small {
            display: none;
          }

          .auth-main {
            padding-top: 1rem;
            padding-bottom: 3rem;
          }

          .auth-story {
            padding-top: 0.4rem;
          }

          .section-kicker {
            width: 100%;
            justify-content: center;
            text-align: center;
          }

          .auth-story h1 {
            font-size: clamp(2.25rem, 12vw, 3rem);
            line-height: 1.02;
          }

          .signal-strip {
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.2rem;
          }

          .signal-strip span {
            white-space: nowrap;
          }

          .story-preview,
          .benefit-card,
          .auth-panel {
            border-radius: 22px;
          }

          .auth-panel {
            padding: 1.15rem;
          }

          .benefit-card,
          .story-preview {
            padding: 1rem;
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

export default Login;
