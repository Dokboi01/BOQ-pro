import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import QuantraIcon from '../ui/QuantraIcon';

const Login = ({ error, onLogin, onSSOLogin, onSwitchToSignUp, onForgotPassword, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailValid = useMemo(() => {
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [email]);

  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { level: 3, label: 'Good', color: '#3b82f6' };
    return { level: 4, label: 'Strong', color: '#22c55e' };
  }, [password]);

  const carouselSlides = [
    {
      icon: <Building2 size={20} />,
      title: 'Company workspace',
      copy: 'Keep your projects tied to one company workflow instead of scattered personal files.',
      stat: '12 teams',
      statLabel: 'Active this month'
    },
    {
      icon: <Calculator size={20} />,
      title: 'Pricing studio',
      copy: 'Open straight into quantity takeoff, benchmark pricing, and custom rate build-up.',
      stat: '1,840 rates',
      statLabel: 'In your rate library'
    },
    {
      icon: <FileSpreadsheet size={20} />,
      title: 'Submission-ready output',
      copy: 'Carry the same BOQ through review and exports without rebuilding it elsewhere.',
      stat: '98% match',
      statLabel: 'Format compliance'
    },
    {
      icon: <Shield size={20} />,
      title: 'Enterprise security',
      copy: 'Role-based access control, audit trails, and encrypted storage for every project.',
      stat: 'SOC 2',
      statLabel: 'Compliance ready'
    }
  ];

  const [carouselIndex, setCarouselIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % carouselSlides.length);
  }, [carouselSlides.length]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

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


  return (
    <div className="auth-shell">
      <div className="auth-atmosphere">
        <div className="floating-orb orb-1" />
        <div className="floating-orb orb-2" />
        <div className="floating-orb orb-3" />
      </div>
      <div className="auth-grid-overlay" />

      <nav className="auth-nav">
        <button className="brand-mark" onClick={onBack}>
          <span className="brand-icon">
            <QuantraIcon size={22} />
          </span>
          <span className="brand-copy">
            <strong>Quantra</strong>
            <small>Professional Bill of Quantities Management</small>
          </span>
        </button>

        <div className="nav-actions">
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
            Access your projects, rates, and exports — everything stays in sync
            across your team, ready for the next submission.
          </p>

          <div className="signal-strip">
            {quickSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>

          {/* Feature Carousel */}
          <div className="feature-carousel">
            <div className="carousel-viewport">
              {carouselSlides.map((slide, i) => (
                <div
                  key={slide.title}
                  className={`carousel-slide ${i === carouselIndex ? 'active' : ''}`}
                >
                  <div className="carousel-slide-header">
                    <div className="carousel-slide-icon">{slide.icon}</div>
                    <h3>{slide.title}</h3>
                  </div>
                  <p>{slide.copy}</p>
                  <div className="carousel-slide-stat">
                    <strong>{slide.stat}</strong>
                    <span>{slide.statLabel}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="carousel-dots">
              {carouselSlides.map((_, i) => (
                <button
                  key={i}
                  className={`carousel-dot ${i === carouselIndex ? 'active' : ''}`}
                  onClick={() => setCarouselIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Mock Dashboard Widget */}
          <div className="mock-dashboard">
            <div className="mock-dash-header">
              <span className="preview-tag">Live workspace preview</span>
              <span className="mock-dash-status">● Synced</span>
            </div>
            <h2 className="mock-dash-title">Lekki Phase 2 — Commercial Summary</h2>
            <div className="mock-dash-grid">
              <div className="mock-dash-card">
                <span className="mock-dash-label">Sections</span>
                <strong>7 / 7</strong>
                <div className="mock-progress"><div className="mock-progress-fill" style={{ width: '100%' }} /></div>
              </div>
              <div className="mock-dash-card">
                <span className="mock-dash-label">Estimate</span>
                <strong>NGN 68.4M</strong>
                <div className="mock-progress"><div className="mock-progress-fill accent" style={{ width: '78%' }} /></div>
              </div>
              <div className="mock-dash-card">
                <span className="mock-dash-label">Rate coverage</span>
                <strong>94%</strong>
                <div className="mock-progress"><div className="mock-progress-fill green" style={{ width: '94%' }} /></div>
              </div>
            </div>
            <div className="mock-dash-rows">
              <div className="mock-row"><span>Substructure</span><span className="mock-row-val">NGN 12.1M</span></div>
              <div className="mock-row"><span>Superstructure</span><span className="mock-row-val">NGN 24.8M</span></div>
              <div className="mock-row"><span>M&E Services</span><span className="mock-row-val">NGN 18.3M</span></div>
              <div className="mock-row"><span>External works</span><span className="mock-row-val">NGN 13.2M</span></div>
            </div>
          </div>
        </section>

        <section className="auth-panel-wrap">
          <div className="auth-panel">
            <div className="auth-card-header">
              <h2>Welcome back</h2>
              <p>Sign in with the company email and password tied to your Quantra workspace.</p>
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
                <div className={`input-with-icon ${emailTouched && emailValid === true ? 'input-valid' : ''} ${emailTouched && emailValid === false ? 'input-invalid' : ''}`}>
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    required
                  />
                  {emailTouched && emailValid === true && (
                    <span className="input-validation-icon valid">
                      <Check size={16} />
                    </span>
                  )}
                  {emailTouched && emailValid === false && (
                    <span className="input-validation-icon invalid">
                      <AlertCircle size={16} />
                    </span>
                  )}
                </div>
                {emailTouched && emailValid === false && (
                  <span className="field-hint error">Please enter a valid email address</span>
                )}
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label className="form-label">Password</label>
                  <button type="button" className="text-link" onClick={onForgotPassword}>Forgot password?</button>
                </div>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordTouched && password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className={`strength-segment ${passwordStrength.level >= seg ? 'active' : ''}`}
                          style={{ backgroundColor: passwordStrength.level >= seg ? passwordStrength.color : undefined }}
                        />
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <label className="remember-row">
                <span className={`custom-checkbox ${rememberMe ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {rememberMe && <Check size={12} />}
                </span>
                <span className="remember-label">Remember me on this device</span>
              </label>

              <button type="submit" className={`auth-submit ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to Quantra
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

            </form>

            <div className="sso-divider">
              <span className="sso-divider-line" />
              <span className="sso-divider-text">or continue with</span>
              <span className="sso-divider-line" />
            </div>

            <div className="sso-buttons">
              <button
                type="button"
                className="sso-btn"
                onClick={() => onSSOLogin?.('google')}
              >
                <svg className="sso-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="sso-btn"
                onClick={() => onSSOLogin?.('microsoft')}
              >
                <svg className="sso-icon" viewBox="0 0 23 23" width="20" height="20">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                <span>Microsoft</span>
              </button>
            </div>

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
            radial-gradient(circle at top left, rgba(30, 108, 247, 0.09), transparent 30%),
            radial-gradient(circle at 88% 16%, rgba(212, 160, 23, 0.08), transparent 22%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 54%, #eef3ff 100%);
          color: var(--primary-900);
          font-family: var(--font-main);
        }

        /* ── Floating Orbs ── */
        .auth-atmosphere {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .floating-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.55;
          will-change: transform;
        }
        .orb-1 {
          width: 420px; height: 420px;
          top: -8%; left: -5%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%);
          animation: orbFloat1 18s ease-in-out infinite;
        }
        .orb-2 {
          width: 320px; height: 320px;
          top: 60%; right: -4%;
          background: radial-gradient(circle, rgba(212, 160, 23, 0.25), transparent 70%);
          animation: orbFloat2 22s ease-in-out infinite;
        }
        .orb-3 {
          width: 260px; height: 260px;
          top: 30%; left: 45%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
          animation: orbFloat3 25s ease-in-out infinite;
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, 30px) scale(1.08); }
          66% { transform: translate(-20px, 50px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, -40px) scale(1.1); }
          66% { transform: translate(25px, -20px) scale(0.92); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -35px) scale(1.12); }
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

        /* ── Stagger Entrance Animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
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
          animation: fadeUp 0.6s ease both;
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
          box-shadow: 0 18px 35px rgba(30, 108, 247, 0.24);
          color: white;
          animation: subtlePulse 3s ease-in-out infinite;
        }
        @keyframes subtlePulse {
          0%, 100% { box-shadow: 0 18px 35px rgba(30, 108, 247, 0.24); }
          50% { box-shadow: 0 18px 45px rgba(30, 108, 247, 0.35); }
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

        .nav-back-btn:hover {
          transform: translateY(-1px);
          border-color: var(--primary-300, #94a3b8);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
        }
        .nav-create-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.2);
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
        .auth-story .section-kicker {
          animation: fadeUp 0.5s ease 0.1s both;
        }
        .auth-story h1 {
          animation: fadeUp 0.6s ease 0.2s both;
        }
        .auth-story .auth-subtitle {
          animation: fadeUp 0.6s ease 0.3s both;
        }
        .auth-story .signal-strip {
          animation: fadeUp 0.5s ease 0.4s both;
        }
        .auth-story .feature-carousel {
          animation: fadeUp 0.6s ease 0.5s both;
        }
        .auth-story .mock-dashboard {
          animation: fadeUp 0.6s ease 0.6s both;
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
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .signal-strip span:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
          border-color: var(--accent-600, #2563eb);
          color: var(--accent-600, #2563eb);
        }

        .preview-tag {
          padding: 0.42rem 0.72rem;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.14);
          color: var(--accent-600);
        }

        /* ── Feature Carousel ── */
        .feature-carousel {
          margin-top: 1.6rem;
          padding: 1.4rem;
          border-radius: 28px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(14px);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-carousel:hover {
          transform: translateY(-3px);
          box-shadow: 0 24px 50px rgba(15, 23, 42, 0.1);
        }

        .carousel-viewport {
          position: relative;
          min-height: 140px;
        }

        .carousel-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.5s ease, transform 0.5s ease;
          pointer-events: none;
        }
        .carousel-slide.active {
          position: relative;
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .carousel-slide-header {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          margin-bottom: 0.6rem;
        }
        .carousel-slide-icon {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(15, 23, 42, 0.06));
          color: var(--accent-600);
        }
        .carousel-slide-header h3 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--primary-950);
        }
        .carousel-slide p {
          margin: 0;
          color: var(--primary-600);
          font-size: 0.88rem;
          line-height: 1.65;
        }
        .carousel-slide-stat {
          margin-top: 0.9rem;
          padding: 0.7rem 0.9rem;
          border-radius: 14px;
          background: var(--primary-50, #f8fafc);
          border: 1px solid var(--border-light, #e2e8f0);
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .carousel-slide-stat strong {
          font-size: 1.15rem;
          color: var(--primary-900);
          font-weight: 800;
        }
        .carousel-slide-stat span {
          font-size: 0.76rem;
          color: var(--primary-500);
          font-weight: 600;
        }

        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 1rem;
        }
        .carousel-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          border: none;
          background: var(--border-medium, #cbd5e1);
          cursor: pointer;
          padding: 0;
          transition: width 0.35s ease, background 0.35s ease;
        }
        .carousel-dot.active {
          width: 24px;
          background: var(--accent-600, #2563eb);
        }

        /* ── Mock Dashboard Widget ── */
        .mock-dashboard {
          margin-top: 1.1rem;
          padding: 1.25rem;
          border-radius: 24px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: var(--shadow-lg, 0 10px 30px rgba(0,0,0,0.06));
          backdrop-filter: blur(10px);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .mock-dashboard:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.1);
        }
        .mock-dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mock-dash-status {
          font-size: 0.72rem;
          font-weight: 700;
          color: #22c55e;
          letter-spacing: 0.02em;
          animation: statusPulse 2s ease-in-out infinite;
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .mock-dash-title {
          margin: 0.75rem 0 0.9rem;
          font-size: 1.1rem;
          color: var(--primary-950);
          font-weight: 800;
        }
        .mock-dash-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.65rem;
        }
        .mock-dash-card {
          padding: 0.75rem;
          border-radius: 14px;
          background: var(--primary-50, #f8fafc);
          border: 1px solid var(--border-light, #e2e8f0);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mock-dash-card:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }
        .mock-dash-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--primary-400);
          margin-bottom: 0.25rem;
        }
        .mock-dash-card strong {
          display: block;
          font-size: 1rem;
          color: var(--primary-900);
          font-weight: 800;
          margin-bottom: 0.45rem;
        }
        .mock-progress {
          height: 4px;
          border-radius: 999px;
          background: var(--border-light, #e2e8f0);
          overflow: hidden;
        }
        .mock-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: var(--accent-600, #2563eb);
          transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mock-progress-fill.accent {
          background: #f59e0b;
        }
        .mock-progress-fill.green {
          background: #22c55e;
        }
        .mock-dash-rows {
          margin-top: 0.75rem;
          display: grid;
          gap: 0;
        }
        .mock-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.55rem 0.5rem;
          border-top: 1px solid var(--border-light, #e2e8f0);
          font-size: 0.82rem;
          color: var(--primary-700);
          border-radius: 8px;
          transition: background 0.2s ease;
        }
        .mock-row:hover {
          background: var(--primary-50, #f8fafc);
        }
        .mock-row:first-child {
          border-top: none;
        }
        .mock-row-val {
          font-weight: 700;
          color: var(--primary-900);
          font-variant-numeric: tabular-nums;
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
          animation: fadeUp 0.7s ease 0.35s both;
          transition: box-shadow 0.4s ease, border-color 0.4s ease;
        }
        .auth-panel:hover {
          box-shadow:
            0 24px 50px rgba(15, 23, 42, 0.1),
            0 0 0 1px rgba(59, 130, 246, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border-color: rgba(59, 130, 246, 0.18);
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
          animation: shakeIn 0.5s ease;
        }
        @keyframes shakeIn {
          0% { transform: translateX(-8px); opacity: 0; }
          25% { transform: translateX(6px); }
          50% { transform: translateX(-4px); }
          75% { transform: translateX(2px); }
          100% { transform: translateX(0); opacity: 1; }
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
          transition: color 0.25s ease;
        }
        .form-input:focus ~ .input-icon,
        .input-with-icon:focus-within .input-icon {
          color: var(--accent-600);
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
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .input-valid .form-input {
          border-color: #22c55e;
        }
        .input-valid .form-input:focus {
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
        }
        .input-invalid .form-input {
          border-color: #ef4444;
        }
        .input-invalid .form-input:focus {
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.10);
        }

        .input-validation-icon {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .input-validation-icon.valid {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
        }
        .input-validation-icon.invalid {
          background: rgba(239, 68, 68, 0.10);
          color: #dc2626;
        }

        @keyframes popIn {
          0% { transform: translateY(-50%) scale(0); opacity: 0; }
          100% { transform: translateY(-50%) scale(1); opacity: 1; }
        }

        .field-hint {
          font-size: 0.76rem;
          font-weight: 600;
          animation: slideDown 0.25s ease;
        }
        .field-hint.error {
          color: #dc2626;
        }
        @keyframes slideDown {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--primary-400);
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .password-toggle:hover {
          background: var(--primary-50, #f1f5f9);
          color: var(--primary-700);
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          animation: slideDown 0.25s ease;
        }
        .strength-bar {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        .strength-segment {
          height: 4px;
          flex: 1;
          border-radius: 999px;
          background: var(--border-light, #e2e8f0);
          transition: background-color 0.3s ease;
        }
        .strength-label {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .remember-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          cursor: pointer;
          user-select: none;
        }
        .custom-checkbox {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 1.5px solid var(--border-medium, #cbd5e1);
          background: white;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
          flex-shrink: 0;
        }
        .custom-checkbox input {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
          margin: 0;
        }
        .custom-checkbox.checked {
          background: var(--accent-600, #2563eb);
          border-color: var(--accent-600, #2563eb);
          color: white;
          transform: scale(1.05);
        }
        .remember-label {
          font-size: 0.84rem;
          color: var(--primary-600);
          font-weight: 600;
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

        .auth-submit {
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
          border: none;
          background: var(--primary-900);
          color: white;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.16);
          position: relative;
          overflow: hidden;
        }

        .auth-submit::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 55%, transparent 60%);
          transform: translateX(-100%);
          transition: none;
        }

        .auth-submit:hover::after {
          animation: btnShine 0.7s ease forwards;
        }

        @keyframes btnShine {
          100% { transform: translateX(100%); }
        }

        .auth-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 38px rgba(15, 23, 42, 0.22);
        }

        .auth-submit.loading {
          pointer-events: none;
          opacity: 0.85;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .sso-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.25rem;
        }
        .sso-divider-line {
          flex: 1;
          height: 1px;
          background: var(--border-light, #e2e8f0);
        }
        .sso-divider-text {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--primary-400);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .sso-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
          margin-top: 0.85rem;
        }

        .sso-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          min-height: 48px;
          padding: 0 1rem;
          border-radius: 14px;
          border: 1px solid var(--border-medium, #cbd5e1);
          background: white;
          color: var(--primary-800, #1e293b);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .sso-btn:hover {
          transform: translateY(-1px);
          border-color: var(--primary-300, #94a3b8);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08);
          background: var(--primary-50, #f8fafc);
        }
        .sso-btn:active {
          transform: translateY(0);
        }
        .sso-icon {
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sso-btn:hover .sso-icon {
          transform: scale(1.15);
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
          .auth-main {
            grid-template-columns: 1fr;
          }
          .mock-dash-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .auth-panel-wrap {
            justify-content: center;
          }
          .auth-panel {
            max-width: 480px;
            margin: 0 auto;
          }
        }

        @media (max-width: 820px) {
          .auth-story {
            display: none;
          }
          .auth-nav {
            gap: 1rem;
            align-items: flex-start;
            flex-direction: column;
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
          .feature-carousel,
          .mock-dashboard,
          .auth-panel {
            border-radius: 22px;
          }
          .auth-panel {
            padding: 1.15rem;
          }
          .feature-carousel,
          .mock-dashboard {
            padding: 1rem;
          }
          .mock-dash-grid {
            grid-template-columns: 1fr;
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
