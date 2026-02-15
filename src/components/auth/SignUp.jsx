import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, Check, AlertCircle } from 'lucide-react';

const SignUp = ({ error, selectedPlan, onSignUp, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    onSignUp(formData);
  };

  return (
    <div className="auth-container view-fade-in">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="logo">
            <Shield size={32} className="text-accent-600" />
            <span>BOQ <strong>PRO</strong></span>
          </div>
          <h1>Create your account</h1>
          <p>Start your professional journey with BOQ Pro</p>
        </div>

        {selectedPlan && (
          <div className="selected-plan-summary">
            <div className="plan-info">
              <span className="label">Selected Plan</span>
              <span className="plan-name">{selectedPlan}</span>
            </div>
            <button className="change-link" onClick={() => onSwitchToLogin('pricing')}>Change</button>
          </div>
        )}

        {error && (
          <div className="auth-error-banner view-fade-in">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                required
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Work Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                className="form-input"
                placeholder="name@company.com"
                required
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                required
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <p className="input-hint">Minimum 8 characters with a symbol</p>
          </div>

          <div className="form-checkbox">
            <input
              type="checkbox"
              id="terms"
              required
              onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
            />
            <label htmlFor="terms">I agree to the <button type="button" className="text-link">Terms of Service</button> and <button type="button" className="text-link">Privacy Policy</button></label>
          </div>

          <button type="submit" className="btn-primary auth-submit">
            Create Account <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <button className="text-link" onClick={() => onSwitchToLogin('login')}>Sign in</button>
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
          max-width: 480px;
          padding: 3rem;
          border-radius: var(--radius-2xl);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
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

        .selected-plan-summary {
          background: var(--primary-50);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .plan-info {
          display: flex;
          flex-direction: column;
        }

        .plan-info .label {
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--primary-500);
          letter-spacing: 0.05em;
        }

        .plan-info .plan-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary-900);
        }

        .change-link {
          background: none;
          border: none;
          color: var(--accent-600);
          font-size: 0.875rem;
          font-weight: 600;
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

        .input-hint {
          font-size: 0.75rem;
          color: var(--primary-400);
          margin-top: 0.4rem;
        }

        .form-checkbox {
          display: flex;
          gap: 0.75rem;
          margin: 1.5rem 0;
          font-size: 0.875rem;
          color: var(--primary-600);
          align-items: flex-start;
        }

        .form-checkbox input {
          margin-top: 0.25rem;
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
          margin-top: 0.5rem;
        }

        .auth-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.875rem;
          color: var(--primary-500);
        }
      `}</style>
    </div>
  );
};

export default SignUp;
