import React, { useState, useRef, useEffect } from 'react';
import { Shield, ArrowRight, RefreshCw, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

const EmailVerification = ({ email, onVerify, onResend, onBack }) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        const timer = resendTimer > 0 && setInterval(() => setResendTimer(resendTimer - 1), 1000);
        return () => clearInterval(timer);
    }, [resendTimer]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        if (value && index < 5) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Please enter the full 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const success = await onVerify(fullCode);
            if (!success) {
                setError('Invalid verification code. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('Verification failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = () => {
        if (resendTimer > 0) return;
        setResendTimer(60);
        onResend();
    };

    return (
        <div className="auth-container view-fade-in">
            <div className="auth-card glass-card">
                <div className="auth-header">
                    <div className="logo">
                        <Shield size={32} className="text-accent-600" />
                        <span>BOQ <strong>PRO</strong></span>
                    </div>
                    <h1>Verify your email</h1>
                    <p>We've sent a 6-digit code and a <strong>verification link</strong> to <strong>{email}</strong></p>
                    <div className="verification-hint">
                        <CheckCircle2 size={16} className="text-success" />
                        <span>You can click the link in your email to verify instantly.</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="code-input-container">
                        {code.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={inputRefs[idx]}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                className={`digit-input ${error ? 'error' : ''}`}
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="auth-error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : (
                            <>Verify Account <CheckCircle2 size={18} /></>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Didn't receive the code?{' '}
                    <button
                        className={`text-link ${resendTimer > 0 ? 'disabled' : ''}`}
                        onClick={handleResend}
                        disabled={resendTimer > 0}
                    >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                    </button>
                    <br />
                    <button className="text-link mt-4" onClick={onBack}>Back to Sign Up</button>
                </div>
            </div>

            <style jsx="true">{`
                .code-input-container {
                    display: flex;
                    justify-content: space-between;
                    gap: 0.75rem;
                    margin: 2rem 0;
                }

                .digit-input {
                    width: 50px;
                    height: 60px;
                    text-align: center;
                    font-size: 1.5rem;
                    font-weight: 800;
                    border: 2px solid var(--border-medium);
                    border-radius: var(--radius-md);
                    background: white;
                    color: var(--primary-900);
                    transition: all 0.2s;
                }

                .verification-hint {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: var(--success-50);
                    border-radius: var(--radius-md);
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--success-700);
                }

                .digit-input:focus {
                    border-color: var(--accent-600);
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
                    outline: none;
                }

                .digit-input.error {
                    border-color: var(--danger-600);
                }

                .auth-error-message {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--danger-600);
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    justify-content: center;
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .disabled { opacity: 0.5; cursor: not-allowed; }
                .mt-4 { margin-top: 1rem; }
            `}</style>
        </div>
    );
};

export default EmailVerification;
