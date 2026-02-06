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
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
        }

        .btn-hero-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.4);
        }

        .btn-hero-secondary {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-hero-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .feature-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
          max-width: 800px;
          margin: 0 auto;
        }

        .feature-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 4rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s;
        }

        .stat-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-4px);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          color: white;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 900;
          color: white;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #94a3b8;
          font-weight: 600;
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
