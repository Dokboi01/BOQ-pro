import React, { useState } from 'react';
import { auth } from '../../db/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import QuantraIcon from '../ui/QuantraIcon';

const PasswordReset = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(messages[err.code] || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-atmosphere" />
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
            Back to login
          </button>
        </div>
      </nav>

      <main className="auth-main" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <section className="auth-panel-wrap">
          <div className="auth-panel">
            {sent ? (
              <>
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.25rem'
                  }}>
                    <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                  </div>
                  <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.55rem', color: 'var(--primary-950)' }}>
                    Check your inbox
                  </h2>
                  <p style={{ color: 'var(--primary-600)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
                    We've sent a password reset link to <strong style={{ color: 'var(--primary-900)' }}>{email}</strong>.
                    Click the link in the email to create a new password.
                  </p>
                  <button
                    onClick={onBack}
                    style={{
                      marginTop: '1.5rem', padding: '0.75rem 2rem',
                      background: 'var(--primary-900)', color: 'white',
                      border: 'none', borderRadius: '16px',
                      fontWeight: 800, fontSize: '0.94rem', cursor: 'pointer',
                      boxShadow: '0 16px 30px rgba(15, 23, 42, 0.16)'
                    }}
                  >
                    Back to Login
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="auth-card-header">
                  <div style={{
                    width: 52, height: 52, borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(15, 23, 42, 0.06))',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem', color: 'var(--accent-600)'
                  }}>
                    <KeyRound size={24} />
                  </div>
                  <h2>Reset your password</h2>
                  <p>Enter the email address linked to your Quantra account and we'll send you a reset link.</p>
                </div>

                {error && (
                  <div className="auth-error-banner">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-group">
                    <label className="form-label">Email address</label>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        className="form-input"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`auth-submit ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending reset link...' : 'Send reset link'}
                  </button>
                </form>

                <div className="auth-footer">
                  <span>Remember your password?</span>
                  <button className="text-link text-link-strong" onClick={onBack}>
                    Back to Login
                  </button>
                </div>
              </>
            )}
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
        .auth-atmosphere {
          position: absolute; inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(30, 108, 247, 0.18), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(212, 160, 23, 0.12), transparent 18%);
          pointer-events: none;
        }
        .auth-grid-overlay {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(203, 213, 225, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.4) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 92%);
          pointer-events: none;
        }
        .auth-nav, .auth-main {
          position: relative; z-index: 2;
          width: min(1220px, calc(100% - 2rem));
          margin: 0 auto;
        }
        .auth-nav {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 1.4rem 0 1rem;
        }
        .brand-mark {
          display: inline-flex; align-items: center; gap: 0.9rem;
          border: none; background: transparent; color: inherit;
          cursor: pointer; padding: 0; text-align: left;
        }
        .brand-icon {
          width: 42px; height: 42px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary-900), var(--accent-600));
          box-shadow: 0 18px 35px rgba(30, 108, 247, 0.24);
          color: white;
        }
        .brand-copy { display: flex; flex-direction: column; gap: 0.1rem; }
        .brand-copy strong { font-size: 1.02rem; letter-spacing: 0.02em; }
        .brand-copy small { font-size: 0.72rem; color: var(--primary-500); }
        .nav-actions { display: flex; align-items: center; gap: 0.75rem; }
        .nav-back-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 0.45rem; border-radius: 999px; padding: 0.75rem 1rem;
          font-size: 0.88rem; font-weight: 700; cursor: pointer;
          transition: transform 0.2s ease;
          border: 1px solid var(--border-medium);
          background: rgba(255, 255, 255, 0.78);
          color: var(--primary-700);
        }
        .nav-back-btn:hover { transform: translateY(-1px); }
        .auth-panel-wrap {
          display: flex; align-items: flex-start; justify-content: center;
        }
        .auth-panel {
          width: 100%; max-width: 480px; padding: 1.6rem;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(14px);
        }
        .auth-card-header h2 { margin: 0; font-size: 1.55rem; color: var(--primary-950); }
        .auth-card-header p { margin: 0.55rem 0 0; color: var(--primary-600); font-size: 0.9rem; line-height: 1.7; }
        .auth-error-banner {
          display: flex; align-items: flex-start; gap: 0.75rem;
          margin-top: 1.2rem; padding: 0.9rem 1rem;
          border-radius: 16px;
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.25);
          color: #dc2626; font-size: 0.88rem; font-weight: 700; line-height: 1.5;
        }
        .auth-form { display: grid; gap: 1rem; margin-top: 1.35rem; }
        .form-group { display: grid; gap: 0.48rem; }
        .form-label {
          font-size: 0.78rem; font-weight: 800; color: var(--primary-700);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .input-with-icon { position: relative; }
        .input-icon {
          position: absolute; left: 1rem; top: 50%;
          transform: translateY(-50%); color: var(--primary-400);
        }
        .form-input {
          width: 100%; min-height: 54px; padding: 0 1rem 0 3rem;
          border-radius: 16px; border: 1px solid var(--border-medium);
          background: white; color: var(--primary-900);
          font-size: 0.95rem; outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .form-input:focus {
          border-color: var(--accent-600);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
        }
        .auth-submit {
          width: 100%; min-height: 52px;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 0.6rem; border-radius: 16px;
          font-size: 0.94rem; font-weight: 800; cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: none; background: var(--primary-900); color: white;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.16);
        }
        .auth-submit:hover { transform: translateY(-2px); }
        .auth-submit.loading { pointer-events: none; opacity: 0.7; }
        .auth-footer {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; margin-top: 1.2rem; padding-top: 1rem;
          border-top: 1px solid var(--border-light);
          color: var(--primary-500); font-size: 0.88rem;
        }
        .text-link {
          background: none; border: none; padding: 0;
          color: var(--accent-600); font-size: 0.82rem; font-weight: 700; cursor: pointer;
        }
        .text-link:hover { text-decoration: underline; }
        .text-link-strong { font-size: 0.88rem; }
        @media (max-width: 640px) {
          .auth-nav, .auth-main {
            width: min(1220px, calc(100% - 1.25rem));
          }
          .auth-panel { border-radius: 22px; padding: 1.15rem; }
        }
      `}</style>
    </div>
  );
};

export default PasswordReset;
