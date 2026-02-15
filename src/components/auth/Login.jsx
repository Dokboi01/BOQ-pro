import React, { useState } from 'react';
import { Shield, Mail, Lock, ArrowRight, Github, AlertCircle, Sparkles, Send } from 'lucide-react';

const Login = ({ error, onLogin, onSendMagicLink, onSwitchToSignUp, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'magic-link'
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (loginMode === 'password') {
      await onLogin({ email, password });
    } else {
      const success = await onSendMagicLink(email);
      if (success) {
        setMessage('✨ Magic link sent! Please check your inbox.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="auth-container view-fade-in">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="logo">
            <Shield size={32} className="text-accent-600" />
            <span>BOQ <strong>PRO</strong></span>
          </div>
          <h1>Welcome Back</h1>
          <p>Login to manage your construction projects</p>
        </div>

        {(error || message) && (
          <div className={`auth-error-banner view-fade-in ${message ? 'success' : ''}`}>
            {message ? <Sparkles size={18} /> : <AlertCircle size={18} />}
            <span>{message || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Work Email</label>
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

          {loginMode === 'password' && (
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button type="submit" className={`btn-primary auth-submit ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="loading-spinner-sm"></span>
                {loginMode === 'password' ? 'Signing in...' : 'Sending Link...'}
              </>
            ) : (
              <>
                {loginMode === 'password' ? 'Sign In' : 'Send Magic Link'}
                {loginMode === 'password' ? <ArrowRight size={18} /> : <Send size={18} />}
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-guest-access"
            onClick={() => onLogin({ email: 'guest@boqpro.com', password: 'password' })}
          >
            Engineer Guest Access (Quick Test)
          </button>
        </form>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <div className="social-auth">
          <button className="btn-outline social-btn">
            <Github size={20} /> GitHub
          </button>
          <button className="btn-outline social-btn">
            Google
          </button>
        </div>

        <div className="auth-footer">
          <button
            type="button"
            className="text-link mode-toggle"
            onClick={() => {
              setLoginMode(loginMode === 'password' ? 'magic-link' : 'password');
              setMessage(null);
            }}
          >
            {loginMode === 'password' ? 'Sign in with Magic Link' : 'Back to Password Login'}
          </button>
          <div className="signup-link">
            Don't have an account? <button className="text-link" onClick={onSwitchToSignUp}>Create account</button>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.05), transparent),
                      radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.05), transparent),
                      var(--bg-main);
          padding: 2rem;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 3rem;
          border-radius: var(--radius-2xl);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }

        h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .auth-header p {
          color: var(--primary-500);
          font-size: 0.875rem;
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

        .input-with-icon .form-input {
          padding-left: 3rem;
        }

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .text-link {
          background: none;
          border: none;
          color: var(--accent-600);
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0;
        }

        .text-link:hover {
          text-decoration: underline;
        }

        .auth-submit {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          margin-top: 1rem;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          margin: 2rem 0;
          color: var(--primary-400);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border-light);
        }

        .auth-divider span {
          padding: 0 1rem;
        }

        .social-auth {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .auth-footer {
          text-align: center;
          font-size: 0.875rem;
          color: var(--primary-500);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .auth-error-banner.success {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .mode-toggle {
          padding: 0.75rem;
          background: rgba(37, 99, 235, 0.05);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(37, 99, 235, 0.1);
          transition: all 0.2s;
        }

        .mode-toggle:hover {
          background: rgba(37, 99, 235, 0.1);
          text-decoration: none;
        }
        .auth-submit.loading {
          pointer-events: none;
          opacity: 0.7;
        }

        .loading-spinner-sm {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        .btn-guest-access {
          width: 100%;
          padding: 0.75rem;
          margin-top: 1rem;
          background: rgba(37, 99, 235, 0.05);
          border: 1px dashed var(--accent-400);
          color: var(--accent-600);
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-guest-access:hover {
          background: var(--accent-50);
          border-color: var(--accent-600);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
