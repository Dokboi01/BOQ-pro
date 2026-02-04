import React, { useState, useRef, useEffect } from 'react';
import { Shield, ArrowRight, RefreshCw, Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

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
                setError('Invalid code. Please double-check your email.');
            }
        } catch (err) {
            console.error(err);
            setError('Verification failed. Server connection error.');
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
        <div className="verify-page view-fade-in">
            <div className="verify-decoration-left"></div>
            <div className="verify-decoration-right"></div>

            <div className="verify-card-premium">
                <button className="back-btn-float" onClick={onBack}>
                    <ArrowLeft size={18} />
                </button>

                <div className="verify-header-box">
                    <div className="verify-icon-glow">
                        <Mail size={32} />
                    </div>
                    <h2>Confirm your Identity</h2>
                    <p>Professional BOQ access requires verification. We've sent a 6-digit code and a verification link to:</p>
                    <div className="email-badge-card">{email}</div>
                </div>

                <div className="verification-method-chips">
                    <div className="method-chip active">
                        <span className="dot pulse"></span>
                        OTP Code
                    </div>
                    <div className="method-chip">
                        Magic Link
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="verify-form-premium">
                    <div className="digit-group-canvas">
                        {code.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={inputRefs[idx]}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                className={`premium-digit-input ${error ? 'error' : ''} ${digit ? 'filled' : ''}`}
                                placeholder="•"
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="error-pill-premium">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="secure-note">
                        <Shield size={14} className="text-accent" />
                        <span>Encrypted Session • Civil Engineering Standards</span>
                    </div>

                    <button type="submit" className="btn-verify-premium" disabled={loading}>
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : (
                            <>Verify & Continue Access <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div className="verify-footer-premium">
                    <p>Didn't receive the email?</p>
                    <button
                        className={`resend-btn-premium ${resendTimer > 0 ? 'locked' : ''}`}
                        onClick={handleResend}
                        disabled={resendTimer > 0}
                    >
                        {resendTimer > 0 ? `Retry available in ${resendTimer}s` : 'Request New Code'}
                    </button>

                    <div className="spam-hint">
                        <span>Tip: Check your <strong>Spam</strong> or <strong>Promotions</strong> folder if not found.</span>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .verify-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0a0f1d;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    font-family: 'Inter', system-ui, sans-serif;
                }

                .verify-decoration-left {
                    position: absolute;
                    top: -10%;
                    left: -10%;
                    width: 40%;
                    height: 50%;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
                    filter: blur(60px);
                    pointer-events: none;
                }

                .verify-decoration-right {
                    position: absolute;
                    bottom: -10%;
                    right: -10%;
                    width: 40%;
                    height: 50%;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
                    filter: blur(60px);
                    pointer-events: none;
                }

                .verify-card-premium {
                    width: 100%;
                    max-width: 520px;
                    background: rgba(17, 24, 39, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 3.5rem;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    z-index: 10;
                }

                .back-btn-float {
                    position: absolute;
                    top: 1.5rem;
                    left: 1.5rem;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .back-btn-float:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateX(-2px);
                }

                .verify-header-box h2 {
                    color: white;
                    font-size: 2rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    letter-spacing: -0.025em;
                }

                .verify-header-box p {
                    color: #94a3b8;
                    font-size: 0.9375rem;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }

                .verify-icon-glow {
                    width: 72px;
                    height: 72px;
                    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin: 0 auto 2rem;
                    box-shadow: 0 0 30px rgba(37, 99, 235, 0.3);
                }

                .email-badge-card {
                    display: inline-block;
                    background: rgba(37, 99, 235, 0.1);
                    border: 1px solid rgba(37, 99, 235, 0.2);
                    padding: 0.5rem 1rem;
                    border-radius: 100px;
                    color: #60a5fa;
                    font-weight: 700;
                    font-size: 0.875rem;
                }

                .verification-method-chips {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin: 2.5rem 0;
                }

                .method-chip {
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #64748b;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .method-chip.active {
                    background: rgba(37, 99, 235, 0.1);
                    border-color: rgba(37, 99, 235, 0.3);
                    color: #3b82f6;
                }

                .dot {
                    width: 6px;
                    height: 6px;
                    background: #3b82f6;
                    border-radius: 50%;
                }

                .pulse {
                    animation: pulse-ring 2s infinite;
                }

                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }

                .digit-group-canvas {
                    display: flex;
                    justify-content: space-between;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }

                .premium-digit-input {
                    width: 100%;
                    aspect-ratio: 1/1.2;
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    text-align: center;
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: white;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .premium-digit-input::placeholder {
                    color: rgba(255, 255, 255, 0.1);
                }

                .premium-digit-input:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: #3b82f6;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
                    outline: none;
                    transform: translateY(-2px);
                }

                .premium-digit-input.filled {
                    border-color: rgba(59, 130, 246, 0.5);
                    background: rgba(59, 130, 246, 0.05);
                }

                .premium-digit-input.error {
                    border-color: #ef4444;
                    background: rgba(239, 68, 68, 0.05);
                }

                .error-pill-premium {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    padding: 0.625rem 1.25rem;
                    border-radius: 12px;
                    color: #f87171;
                    font-size: 0.875rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-bottom: 2rem;
                }

                .secure-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #475569;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }

                .btn-verify-premium {
                    width: 100%;
                    padding: 1rem;
                    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                    color: white;
                    border: none;
                    border-radius: 14px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    transition: all 0.3s;
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
                }

                .btn-verify-premium:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4);
                    filter: brightness(1.1);
                }

                .btn-verify-premium:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .verify-footer-premium {
                    margin-top: 3rem;
                    padding-top: 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .verify-footer-premium p {
                    color: #64748b;
                    font-size: 0.8125rem;
                    margin-bottom: 1rem;
                }

                .resend-btn-premium {
                    background: none;
                    border: none;
                    color: #3b82f6;
                    font-weight: 700;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: color 0.2s;
                }

                .resend-btn-premium:hover:not(.locked) {
                    color: #60a5fa;
                    text-decoration: underline;
                }

                .resend-btn-premium.locked {
                    color: #475569;
                    cursor: not-allowed;
                }

                .spam-hint {
                    margin-top: 1.5rem;
                    font-size: 0.75rem;
                    color: #475569;
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default EmailVerification;
