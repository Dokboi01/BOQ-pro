import React from 'react';
import { ShieldCheck, BarChart3, Clock, Layers } from 'lucide-react';

const Hero = ({ onGetStarted }) => {
    return (
        <div className="hero-section">
            <div className="hero-content">
                <div className="badge">Platform for Professionals</div>
                <h1>Intelligent Construction <br /><span>Cost Management</span></h1>
                <p>
                    BOQ Pro is the financial control system for engineering projects. Precise quantity surveying, unit rate computation, and cost analytics in one enterprise platform.
                </p>
                <div className="hero-actions">
                    <button className="btn-primary-large" onClick={onGetStarted}>
                        Enter Platform
                    </button>
                    <button className="btn-secondary-large">
                        Watch Technical Demo
                    </button>
                </div>

                <div className="hero-features">
                    <div className="feature">
                        <ShieldCheck size={20} className="icon" />
                        <span>Audit-Ready BOQs</span>
                    </div>
                    <div className="feature">
                        <BarChart3 size={20} className="icon" />
                        <span>Real-time Analytics</span>
                    </div>
                    <div className="feature">
                        <Clock size={20} className="icon" />
                        <span>Accelerated Tender Prep</span>
                    </div>
                </div>
            </div>

            <div className="hero-visual">
                <div className="dashboard-mockup">
                    <div className="mock-header">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                    <div className="mock-body">
                        <div className="mock-sidebar"></div>
                        <div className="mock-main">
                            <div className="mock-kpi-row">
                                <div className="mock-kpi"></div>
                                <div className="mock-kpi"></div>
                                <div className="mock-kpi"></div>
                            </div>
                            <div className="mock-table">
                                <div className="mock-row"></div>
                                <div className="mock-row"></div>
                                <div className="mock-row"></div>
                                <div className="mock-row"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
        .hero-section {
          min-height: 90vh;
          display: flex;
          align-items: center;
          padding: 4rem 8%;
          gap: 4rem;
          background: radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.05) 0%, transparent 50%),
                      white;
        }

        .hero-content {
          flex: 1;
          max-width: 600px;
        }

        .badge {
          display: inline-block;
          background: rgba(37, 99, 235, 0.1);
          color: var(--accent-600);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 600;
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
          margin-bottom: 2.5rem;
          max-width: 500px;
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        .btn-primary-large {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 600;
        }

        .btn-secondary-large {
          background: white;
          color: var(--primary-900);
          border: 1px solid var(--border-medium);
          padding: 1rem 2rem;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          font-weight: 600;
        }

        .hero-features {
          display: flex;
          gap: 2rem;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--primary-700);
        }

        .feature .icon {
          color: var(--success-600);
        }

        .hero-visual {
          flex: 1;
          display: flex;
          justify-content: center;
          perspective: 1000px;
        }

        .dashboard-mockup {
          width: 100%;
          max-width: 550px;
          height: 400px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          transform: rotateY(-15deg) rotateX(10deg);
          overflow: hidden;
        }

        .mock-header {
          height: 40px;
          background: var(--bg-main);
          border-bottom: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          padding: 0 1rem;
          gap: 0.5rem;
        }

        .dot { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; }

        .mock-body { display: flex; height: calc(100% - 40px); }
        .mock-sidebar { width: 40px; background: var(--primary-900); opacity: 0.05; }
        .mock-main { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .mock-kpi-row { display: flex; gap: 1rem; }
        .mock-kpi { flex: 1; height: 60px; background: var(--bg-main); border-radius: 4px; }
        .mock-table { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
        .mock-row { height: 12px; background: var(--bg-main); border-radius: 2px; width: 100%; }
        .mock-row:nth-child(even) { width: 80%; }
      `}</style>
        </div>
    );
};

export default Hero;
