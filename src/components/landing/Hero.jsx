import React from 'react';
import { Shield, TrendingUp, Users, Zap, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

const Hero = ({ onGetStarted, onLogin }) => {
  const stats = [
    { value: '₦2.4B+', label: 'Projects Managed', icon: TrendingUp },
    { value: '500+', label: 'Civil Engineers', icon: Users },
    { value: '99.9%', label: 'Accuracy Rate', icon: Sparkles },
    { value: '<2min', label: 'BOQ Generation', icon: Zap }
  ];

  const features = [
    'AI-Powered Cost Estimation',
    'Real-Time Cloud Sync',
    'Professional PDF/Excel Export',
    'Market Price Intelligence',
    'Multi-Project Management',
    'Enterprise Security (RLS)'
  ];

  return (
    <div className="hero-container">
      {/* Animated Background */}
      <div className="hero-bg-gradient"></div>
      <div className="hero-bg-grid"></div>

      {/* Premium Header Navigation */}
      <nav className="hero-header">
        <div className="hero-logo">
          <Shield size={32} className="text-accent-500" />
          <span>BOQ <strong>PRO</strong><sup>®</sup></span>
        </div>
        <div className="header-actions">
          <button className="btn-text" onClick={onLogin}>Log In</button>
          <button className="btn-nav-primary" onClick={onGetStarted}>Sign Up</button>
        </div>
      </nav>

      <div className="hero-content">
        {/* Main Hero Section */}
        <div className="hero-main">
          <div className="badge-pill">
            <Sparkles size={16} />
            <span>AI-Powered BOQ Platform</span>
          </div>

          <h1 className="hero-title">
            Intelligent Infrastructure
            <span className="gradient-text"> Cost Management</span>
          </h1>

          <p className="hero-subtitle">
            The next-generation platform for Civil Engineers and Quantity Surveyors.
            Harnessing **AI-powered market intelligence** to deliver professional BOQs with
            unrivaled speed and regional accuracy.
          </p>

          <div className="hero-cta">
            <button className="btn-hero-primary" onClick={onGetStarted}>
              Get Started Free
              <ArrowRight size={20} />
            </button>
            <button className="btn-hero-secondary" onClick={onLogin}>
              <Users size={20} />
              Existing User Login
            </button>
          </div>

          {/* Feature Pills */}
          <div className="feature-pills">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-pill">
                <CheckCircle2 size={16} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-grid">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="stat-card">
                <div className="stat-icon">
                  <Icon size={24} />
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx="true">{`
        .hero-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0f1d 0%, #1a1f35 100%);
          padding: 4rem 2rem;
        }

        .hero-bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 20%, rgba(37, 99, 235, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-bg-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }

        .hero-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 2rem 5%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
        }

        .hero-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          color: white;
          font-weight: 800;
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

        .btn-nav-primary {
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.4);
          color: #60a5fa;
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-nav-primary:hover {
          background: var(--accent-600);
          color: white;
          border-color: var(--accent-600);
        }

        .hero-main {
          text-align: center;
          margin-top: 4rem;
          margin-bottom: 4rem;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.3);
          padding: 0.5rem 1.25rem;
          border-radius: 100px;
          color: #60a5fa;
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 2rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 900;
          color: white;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
        }

        .gradient-text {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: #94a3b8;
          max-width: 700px;
          margin: 0 auto 2.5rem;
          line-height: 1.6;
        }

        .hero-cta {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 3rem;
        }

        .btn-hero-primary {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.125rem 2.5rem;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4), 0 0 0 0 rgba(37, 99, 235, 0.5);
          overflow: hidden;
        }

        .btn-hero-primary::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .btn-hero-primary:hover::before {
          width: 300px;
          height: 300px;
        }

        .btn-hero-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 20px 50px rgba(37, 99, 235, 0.5), 0 0 0 4px rgba(37, 99, 235, 0.2);
        }

        .btn-hero-secondary {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.125rem 2.5rem;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }

        .feature-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          max-width: 850px;
          margin: 0 auto;
        }

        .feature-pill {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.3s;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .feature-pill:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
        }

        .feature-pill svg {
          color: #22c55e;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-top: 4rem;
        }

        .stat-card {
          position: relative;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.6s;
          pointer-events: none;
        }

        .stat-card:hover::before { opacity: 1; }
        .stat-card:hover {
          background: rgba(255, 255, 255, 0.85);
          transform: translateY(-6px);
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 25px 50px -12px rgba(37, 99, 235, 0.2);
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          color: white;
          box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.3);
          transition: all 0.3s;
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 12px 24px -6px rgba(59, 130, 246, 0.5);
        }

        .stat-value {
          font-size: 2.75rem;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #475569;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-cta {
            flex-direction: column;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Hero;
