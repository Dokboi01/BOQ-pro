import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle2, AlertCircle, Loader2, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { auth, db } from '../../db/firebase';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const FirebaseActionHandler = ({ mode, actionCode, onContinue }) => {
    const [status, setStatus] = useState('verifying'); // verifying, resetForm, success, error
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (mode === 'verifyEmail') {
            const verifyEmail = async () => {
                if (!actionCode) {
                    setStatus('error');
                    setMessage('Verification code is missing or expired.');
                    return;
                }

                try {
                    // Apply the action code logic
                    await applyActionCode(auth, actionCode);

                    // Keep the Firestore profile in sync when the verifying user is signed in,
                    // but don't fail the whole verification flow if that profile write misses.
                    if (auth.currentUser) {
                        try {
                            await setDoc(doc(db, 'profiles', auth.currentUser.uid), {
                                email: auth.currentUser.email,
                                is_verified: true,
                                updated_at: serverTimestamp(),
                            }, { merge: true });
                        } catch (profileError) {
                            console.warn('Profile verification sync failed:', profileError);
                        }
                    }

                    setStatus('success');
                    setMessage('Your email has been successfully verified.');
                } catch (error) {
                    console.error("Verification error", error);
                    setStatus('error');

                    // Map Firebase error codes
                    if (error.code === 'auth/expired-action-code') {
                        setMessage('This verification link has expired. Please request a new one.');
                    } else if (error.code === 'auth/invalid-action-code') {
                        setMessage('This verification link is invalid or has already been used.');
                    } else if (error.code === 'auth/user-disabled') {
                        setMessage('This account has been disabled. Please contact support.');
                    } else {
                        setMessage('Failed to verify email. Please try again.');
                    }
                }
            };

            verifyEmail();
        } else if (mode === 'resetPassword') {
            const checkResetCode = async () => {
                if (!actionCode) {
                    setStatus('error');
                    setMessage('Reset link is missing the verification code.');
                    return;
                }

                try {
                    const emailAddress = await verifyPasswordResetCode(auth, actionCode);
                    setEmail(emailAddress);
                    setStatus('resetForm');
                } catch (error) {
                    console.error("Reset code error", error);
                    setStatus('error');

                    if (error.code === 'auth/expired-action-code') {
                        setMessage('This password reset link has expired. Please request a new one.');
                    } else if (error.code === 'auth/invalid-action-code') {
                        setMessage('This password reset link is invalid or has already been used.');
                    } else {
                        setMessage('Invalid or expired reset link. Please try again.');
                    }
                }
            };

            checkResetCode();
        } else {
            setStatus('error');
            setMessage('Invalid action mode. Expected email verification or password reset.');
        }
    }, [actionCode, mode]);

    const handleResetSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            setLocalError('Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        setLocalError('');
        setIsSubmitting(true);

        try {
            await confirmPasswordReset(auth, actionCode, newPassword);
            setStatus('success');
            setMessage('Your password has been successfully reset. You can now log in with your new password.');
        } catch (error) {
            console.error("Confirm reset error", error);
            if (error.code === 'auth/weak-password') {
                setLocalError('Password is too weak. Please use a stronger password.');
            } else if (error.code === 'auth/expired-action-code') {
                setLocalError('This password reset link has expired. Please request a new one.');
            } else {
                setLocalError(error.message || 'Failed to reset password. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="action-handler-page view-fade-in">
            <div className="action-decoration-left"></div>
            <div className="action-decoration-right"></div>

            <div className="action-card-premium">
                <div className={`action-icon-glow ${status}`}>
                    {status === 'verifying' && <Loader2 size={40} className="animate-spin" />}
                    {status === 'resetForm' && <KeyRound size={40} style={{ color: '#d4a017' }} />}
                    {status === 'success' && <CheckCircle2 size={40} />}
                    {status === 'error' && <AlertCircle size={40} />}
                </div>

                {status === 'verifying' && (
                    <>
                        <h2>Verifying Link</h2>
                        <p>Hang tight while we confirm your credentials securely with our servers.</p>
                    </>
                )}

                {status === 'resetForm' && (
                    <>
                        <h2>Reset Password</h2>
                        <p style={{ marginBottom: '1.5rem' }}>Create a new password for <strong style={{ color: 'white' }}>{email}</strong></p>

                        {localError && (
                            <div className="local-error-banner">
                                <AlertCircle size={16} />
                                <span>{localError}</span>
                            </div>
                        )}

                        <form onSubmit={handleResetSubmit} className="action-form">
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <div className="input-with-icon">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <div className="input-with-icon">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-continue-premium"
                                style={{ marginTop: '1.5rem', marginBottom: 0 }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" /> Updating Password...
                                    </>
                                ) : (
                                    <>
                                        Update Password <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <h2>Success!</h2>
                        <p>{message}</p>
                        <p className="subtitle mt-4 text-success-500">
                            Your account is fully secured.
                        </p>

                        <button className="btn-continue-premium" onClick={onContinue}>
                            Return to Login <ArrowRight size={20} />
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2>Action Failed</h2>
                        <p>{message}</p>

                        <button className="btn-retry-premium" onClick={onContinue}>
                            Return to Login
                        </button>
                    </>
                )}

                <div className="secure-note">
                    <Shield size={14} className="text-accent" />
                    <span>Encrypted Session • BOQ-Pro Security</span>
                </div>
            </div>

            <style jsx="true">{`
                .action-handler-page {
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

                .action-decoration-left {
                    position: absolute;
                    top: -10%;
                    left: -10%;
                    width: 40%;
                    height: 50%;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
                    filter: blur(60px);
                    pointer-events: none;
                }

                .action-decoration-right {
                    position: absolute;
                    bottom: -10%;
                    right: -10%;
                    width: 40%;
                    height: 50%;
                    background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
                    filter: blur(60px);
                    pointer-events: none;
                }

                .action-card-premium {
                    width: 100%;
                    max-width: 480px;
                    background: rgba(17, 24, 39, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 3.5rem 3rem;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    text-align: center;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .action-icon-glow {
                    width: 80px;
                    height: 80px;
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin: 0 auto 2rem;
                    transition: all 0.5s ease;
                }

                .action-icon-glow.verifying {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
                }

                .action-icon-glow.resetForm {
                    background: linear-gradient(135deg, rgba(212, 160, 23, 0.15) 0%, rgba(161, 124, 16, 0.08) 100%);
                    border: 1px solid rgba(212, 160, 23, 0.3);
                    box-shadow: 0 0 30px rgba(212, 160, 23, 0.2);
                }

                .action-icon-glow.success {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
                    animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .action-icon-glow.error {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
                }

                @keyframes scaleIn {
                    0% { transform: scale(0); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .action-card-premium h2 {
                    color: white;
                    font-size: 1.875rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    letter-spacing: -0.025em;
                }

                .action-card-premium p {
                    color: #94a3b8;
                    font-size: 1rem;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                }

                .action-form {
                    width: 100%;
                    display: grid;
                    gap: 1.25rem;
                    margin-top: 0.5rem;
                    text-align: left;
                }

                .form-group {
                    display: grid;
                    gap: 0.5rem;
                }

                .form-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .input-with-icon {
                    position: relative;
                }

                .input-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #475569;
                }

                .form-input {
                    width: 100%;
                    min-height: 50px;
                    padding: 0 1rem 0 3rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    background: rgba(15, 23, 42, 0.6);
                    color: white;
                    font-size: 0.95rem;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .form-input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }

                .local-error-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    font-size: 0.85rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .btn-continue-premium {
                    width: 100%;
                    padding: 1rem;
                    margin-top: 2rem;
                    margin-bottom: 2rem;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
                    box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
                }

                .btn-continue-premium:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.4);
                    filter: brightness(1.1);
                }

                .btn-retry-premium {
                    width: 100%;
                    padding: 1rem;
                    margin-top: 2rem;
                    margin-bottom: 2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    border-radius: 14px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-retry-premium:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .secure-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #475569;
                    font-weight: 600;
                    margin-top: auto;
                }

                .mt-4 { margin-top: 1rem; }
                .text-success-500 { color: #22c55e !important; }

                .animate-spin {
                    animation: spin 1.5s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default FirebaseActionHandler;
