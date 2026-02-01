import React, { useState } from 'react';
import { Shield, ArrowRight, UserCircle, Briefcase, GraduationCap, HardHat, Rocket, CheckCircle2 } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [userType, setUserType] = useState(null);

    const userTypes = [
        { id: 'student', label: 'Student', icon: <GraduationCap size={32} />, description: 'Learning engineering and quantity surveying' },
        { id: 'engineer', label: 'Engineer', icon: <HardHat size={32} />, description: 'Structural or Civil engineering professional' },
        { id: 'contractor', label: 'Contractor', icon: <Briefcase size={32} />, description: 'Managing construction tenders and execution' },
        { id: 'qs', label: 'Quantity Surveyor', icon: <UserCircle size={32} />, description: 'Expert cost estimation and management' }
    ];

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else onComplete({ userType });
    };

    return (
        <div className="onboarding-container view-fade-in">
            <div className="onboarding-card glass-card">
                <div className="step-indicator">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`step-dot ${s <= step ? 'active' : ''}`}></div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="step-content">
                        <div className="step-icon">
                            <Shield size={48} className="text-accent-600" />
                        </div>
                        <h1>Welcome to BOQ Pro</h1>
                        <p>Let's personalize your workspace to match your professional workflow.</p>
                        <button className="btn-primary" onClick={handleNext}>
                            Get Started <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-content">
                        <h2>What describes you best?</h2>
                        <p className="subtitle">We'll tailor your experience based on your role.</p>

                        <div className="type-grid">
                            {userTypes.map((type) => (
                                <div
                                    key={type.id}
                                    className={`type-card ${userType === type.id ? 'selected' : ''}`}
                                    onClick={() => setUserType(type.id)}
                                >
                                    <div className="type-icon">{type.icon}</div>
                                    <h3>{type.label}</h3>
                                    <p>{type.description}</p>
                                    {userType === type.id && <CheckCircle2 size={20} className="select-badge" />}
                                </div>
                            ))}
                        </div>

                        <button
                            className="btn-primary mt-4"
                            disabled={!userType}
                            onClick={handleNext}
                        >
                            Continue <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="step-content">
                        <div className="step-icon">
                            <Rocket size={48} className="text-accent-600" />
                        </div>
                        <h2>You're all set!</h2>
                        <p>Your workspace is ready. Let's create your first intelligent bill of quantities.</p>
                        <div className="onboarding-summary">
                            <ul>
                                <li><CheckCircle2 size={16} className="text-success" /> Personal workspace created</li>
                                <li><CheckCircle2 size={16} className="text-success" /> Standard templates loaded</li>
                                <li><CheckCircle2 size={16} className="text-success" /> Material library synchronized</li>
                            </ul>
                        </div>
                        <button className="btn-primary" onClick={handleNext}>
                            Go to Dashboard <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            <style jsx="true">{`
        .onboarding-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-main);
          padding: 2rem;
        }

        .onboarding-card {
          width: 100%;
          max-width: 600px;
          padding: 4rem 3rem;
          border-radius: var(--radius-2xl);
          text-align: center;
        }

        .step-indicator {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 3rem;
        }

        .step-dot {
          width: 40px;
          height: 4px;
          background: var(--border-medium);
          border-radius: 100px;
          transition: all 0.3s;
        }

        .step-dot.active {
          background: var(--accent-600);
          width: 60px;
        }

        .step-content h1, .step-content h2 {
          font-size: 2rem;
          margin: 1.5rem 0 1rem;
        }

        .subtitle {
          color: var(--primary-500);
          margin-bottom: 2.5rem;
        }

        .type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .type-card {
          border: 1px solid var(--border-light);
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          background: white;
        }

        .type-card:hover {
          border-color: var(--accent-400);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .type-card.selected {
          border: 2px solid var(--accent-600);
          background: rgba(37, 99, 235, 0.02);
        }

        .type-icon {
          color: var(--primary-400);
          margin-bottom: 1rem;
        }

        .type-card.selected .type-icon {
          color: var(--accent-600);
        }

        .type-card h3 {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .type-card p {
          font-size: 0.8125rem;
          color: var(--primary-500);
          line-height: 1.4;
        }

        .select-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          color: var(--accent-600);
        }

        .onboarding-summary {
          background: var(--primary-50);
          border-radius: var(--radius-md);
          padding: 2rem;
          margin: 2rem 0;
          text-align: left;
        }

        .onboarding-summary ul {
          list-style: none;
        }

        .onboarding-summary li {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          font-weight: 600;
          color: var(--primary-700);
        }

        .mt-4 { margin-top: 1rem; }
        .text-success { color: var(--success-600); }
      `}</style>
        </div>
    );
};

export default Onboarding;
