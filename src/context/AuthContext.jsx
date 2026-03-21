import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../db/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile as updateAuthProfile,
    browserLocalPersistence,
    setPersistence
} from 'firebase/auth';
import { analytics } from '../db/firebase';
import { logEvent as logAnalyticsEvent } from 'firebase/analytics';
import { getProfile, updateProfile } from '../db/database';
import AuthContext from './auth-context';
import { useToast } from '../components/ui/useToast';
import { buildCompanyKey, deriveCompanyName } from '../utils/companyAccess';

const PUBLIC_VIEWS = new Set(['landing', 'pricing', 'login', 'signup', 'forgot-password']);

export function AuthProvider({ children }) {
    const toast = useToast();

    // Initialize from cache for instant UI
    const cachedProfile = localStorage.getItem('boq_pro_profile');
    let initialUser = null;
    let initialView = 'loading';
    if (cachedProfile) {
        try {
            initialUser = JSON.parse(cachedProfile);
            initialView = initialUser?.is_onboarded === false ? 'onboarding' : 'app';
        } catch { /* ignore */ }
    }

    const [user, setUser] = useState(initialUser);
    const [view, setView] = useState(initialView);
    const [authError, setAuthError] = useState(null);
    const [pendingUser, setPendingUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [verificationEmailStatus, setVerificationEmailStatus] = useState('idle');
    const initializationComplete = useRef(false);
    const userRef = useRef(initialUser);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Auto-clear auth errors on view changes
    const navigateTo = (newView) => {
        setAuthError(null);
        if (newView !== 'verification') {
            setVerificationEmailStatus('idle');
        }
        setView(newView);
    };

    // Helper: fetch profile in background and hydrate user state
    // NOTE: This should NOT redirect to onboarding — it runs as a background
    // refresh after login. The onAuthStateChanged listener handles onboarding
    // redirection during initial load instead.
    const hydrateProfile = async (firebaseUser) => {
        try {
            const profile = await getProfile(firebaseUser.uid);
            if (profile) {
                let fullUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...profile
                };
                fullUser.company_name = fullUser.company_name || deriveCompanyName({ companyName: fullUser.company_name, email: firebaseUser.email });
                fullUser.company_key = fullUser.company_key || buildCompanyKey({
                    companyKey: fullUser.company_key,
                    companyName: fullUser.company_name,
                    email: firebaseUser.email
                });
                // 🛡️ GUARD: Never let a stale Firestore fetch downgrade is_onboarded
                // If the user completed onboarding locally, preserve that status
                setUser(prev => {
                    if (prev?.is_onboarded && !fullUser.is_onboarded) {
                        const sameRole = prev?.role && fullUser.role && prev.role === fullUser.role;
                        if (sameRole) {
                            fullUser = { ...fullUser, is_onboarded: true };
                        }
                    }
                    localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
                    return fullUser;
                });
            }
        } catch (err) {
            console.warn('⚠️ Background profile fetch failed:', err.message);
            // Don't change view on background failure - stay on dashboard
        }
    };

    // Firebase Auth Initialization & State Listener
    useEffect(() => {
        // Set persistence once on mount
        setPersistence(auth, browserLocalPersistence).catch(err => {
            console.warn('⚠️ Persistence setup failed:', err.message);
        });

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('🔐 AUTH STATE:', firebaseUser ? firebaseUser.email : 'signed out');

            if (firebaseUser) {
                // 🛡️ GUARD: If already initialized and on 'app', don't re-navigate
                // This prevents the loop where setUser -> re-fires listener -> re-navigates to onboarding
                if (initializationComplete.current) {
                    // Just silently refresh profile in background
                    hydrateProfile(firebaseUser);
                    return;
                }

                // If we already have a cached user, skip blocking on Firestore
                const cached = localStorage.getItem('boq_pro_profile');
                if (cached) {
                    try {
                        const cachedUser = JSON.parse(cached);
                        if (cachedUser.id === firebaseUser.uid) {
                            setUser(cachedUser);
                            initializationComplete.current = true;
                            setView(cachedUser?.is_onboarded === false ? 'onboarding' : 'app');
                            // Silently refresh profile in background
                            hydrateProfile(firebaseUser);
                            return;
                        }
                    } catch { /* ignore bad cache */ }
                }

                // No cache hit — do a blocking fetch (first-time login is handled optimistically in handleLogin)
                try {
                    const profile = await getProfile(firebaseUser.uid);
                    const fullUser = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        ...profile
                    };
                    fullUser.company_name = fullUser.company_name || deriveCompanyName({ companyName: fullUser.company_name, email: firebaseUser.email });
                    fullUser.company_key = fullUser.company_key || buildCompanyKey({
                        companyKey: fullUser.company_key,
                        companyName: fullUser.company_name,
                        email: firebaseUser.email
                    });
                    setUser(fullUser);
                    localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
                    initializationComplete.current = true;

                    if (profile && profile.is_onboarded) {
                        setView('app');
                    } else {
                        setView('onboarding');
                    }
                } catch (err) {
                    console.error('⚠️ Firestore profile fetch failed:', err.message);
                    // 🛡️ RESILIENCE: If Firestore fails (offline/network), don't dump to onboarding.
                    // Instead, use basic Auth data and try to go to the dashboard.
                    const basicUser = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        full_name: firebaseUser.displayName || 'Practitioner',
                        plan: 'Free',
                        company_name: deriveCompanyName({ email: firebaseUser.email }),
                        company_key: buildCompanyKey({ email: firebaseUser.email })
                    };
                    setUser(basicUser);
                    localStorage.setItem('boq_pro_profile', JSON.stringify(basicUser));
                    initializationComplete.current = true;

                    // If we suspect they are already onboarded (or we just don't know), 
                    // prefer the landing page — user will navigate from there.
                    setView('app');
                }
            } else {
                // User is signed out
                localStorage.removeItem('boq_pro_profile');
                setUser(null);
                setPendingUser(null);
                setVerificationEmailStatus('idle');
                initializationComplete.current = true;
                setView(prev => PUBLIC_VIEWS.has(prev) ? prev : 'landing');
            }
        });

        // Fallback timeout: only trigger if definitely not initialized AND no user detected
        const timer = setTimeout(() => {
            if (!initializationComplete.current && !auth.currentUser && !userRef.current) {
                console.warn('Initialization timed out - returning to landing');
                setView('landing');
                initializationComplete.current = true;
            }
        }, 8000); // Increased to 8s for slower networks

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []); // Subscribe ONCE on mount — never re-subscribe on user changes

    const handleLogin = async (credentials) => {
        setAuthError(null);
        console.log('🚀 Attempting login for:', credentials.email);

        // Guest bypass — skip Firebase Auth entirely
        if (credentials.email === 'guest@boqpro.com') {
            const guestUser = {
                id: 'guest_user',
                email: 'guest@boqpro.com',
                full_name: 'Guest Engineer',
                plan: 'Professional',
                is_onboarded: true,
                role: 'Quantity Surveyor'
            };
            setUser(guestUser);
            localStorage.setItem('boq_pro_profile', JSON.stringify(guestUser));
            setView('app');
            return;
        }

        try {
            const result = await signInWithEmailAndPassword(
                auth,
                credentials.email,
                credentials.password
            );

            console.log('✅ Login successful:', result.user.email);

            // ⚡ Optimistic navigation — go to app IMMEDIATELY with basic data
            // Don't wait for Firestore profile fetch
            const optimisticUser = {
                id: result.user.uid,
                email: result.user.email,
                full_name: result.user.displayName || 'Practitioner',
                plan: 'Free',
                is_onboarded: false,
                company_name: deriveCompanyName({ email: result.user.email }),
                company_key: buildCompanyKey({ email: result.user.email })
            };
            setUser(optimisticUser);
            localStorage.setItem('boq_pro_profile', JSON.stringify(optimisticUser));
            initializationComplete.current = true; // ⚡ IMPORTANT: Prevents the timeout from kicking us out
            setView('app');

            // Hydrate full profile in background (non-blocking)
            hydrateProfile(result.user);

            // Track login
            if (analytics) {
                logAnalyticsEvent(analytics, 'login', { method: 'email' });
            }
        } catch (error) {
            console.error('❌ Login failed:', error.message);
            const messages = {
                'auth/invalid-credential': 'Invalid email or password.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/wrong-password': 'Incorrect password.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
                'auth/invalid-email': 'Please enter a valid email address.',
            };
            setAuthError(messages[error.code] || error.message);
        }
    };

    const handleSignUp = async (data) => {
        setAuthError(null);
        setVerificationEmailStatus('idle');
        console.log('🚀 Attempting signup for:', data.email);

        try {
            const company_name = deriveCompanyName({ companyName: data.companyName, email: data.email });
            const company_key = buildCompanyKey({ companyName: company_name, email: data.email });

            const result = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );

            // Update Firebase Auth display name
            await updateAuthProfile(result.user, {
                displayName: data.fullName
            });

            // Create profile in Firestore (non-blocking — if it fails, user still proceeds)
            try {
                await updateProfile({
                    full_name: data.fullName,
                    company_name,
                    company_key,
                    phone_number: data.phoneNumber,
                    plan: selectedPlan || 'Free',
                    email: data.email,
                    is_onboarded: false
                });
            } catch (profileErr) {
                console.warn('⚠️ Firestore profile creation failed (will retry later):', profileErr.message);
            }

            console.log('✅ Signup successful:', result.user.email);
            setPendingUser(result.user);
            initializationComplete.current = true; // ⚡ Prevent timeout on signup path

            setView('verification');

            try {
                await sendEmailVerification(result.user);
                setVerificationEmailStatus('sent');
                toast.success(`Verification email sent to ${result.user.email}.`);
            } catch (emailErr) {
                console.warn('⚠️ Verification email failed:', emailErr.message);
                setVerificationEmailStatus('failed');
                setAuthError('Your account was created, but we could not send the verification email. Use "Resend Email" and try again in a moment.');
                toast.error('Account created, but the verification email could not be sent.');
            }
        } catch (error) {
            console.error('❌ Signup failed:', error.message);
            const messages = {
                'auth/email-already-in-use': 'An account with this email already exists.',
                'auth/weak-password': 'Password should be at least 6 characters.',
                'auth/invalid-email': 'Please enter a valid email address.',
            };
            setAuthError(messages[error.code] || error.message);
        }
    };


    const handleResendCode = async () => {
        const targetUser = auth.currentUser || pendingUser;
        if (targetUser) {
            try {
                setAuthError(null);
                await sendEmailVerification(targetUser);
                console.log('📧 Verification email resent to:', targetUser.email);
                setVerificationEmailStatus('sent');
                toast.success(`Verification email sent to ${targetUser.email}.`);
            } catch (err) {
                console.error('❌ Failed to resend verification email:', err.message);
                setVerificationEmailStatus('failed');
                setAuthError('We could not send the verification email right now. Please try again later.');
                toast.error('Verification email could not be sent.');
            }
        }
    };

    const handleOnboardingComplete = async (data) => {
        try {
            const updatedProfile = await updateProfile({
                role: data.userType,
                is_onboarded: true
            });
            if (updatedProfile) {
                const updatedUser = { ...user, ...updatedProfile, is_onboarded: true };
                setUser(updatedUser);
                localStorage.setItem('boq_pro_profile', JSON.stringify(updatedUser));
            } else {
                // Even if Firestore update didn't return data, update local state
                const updatedUser = { ...user, role: data.userType, is_onboarded: true };
                setUser(updatedUser);
                localStorage.setItem('boq_pro_profile', JSON.stringify(updatedUser));
            }
        } catch (err) {
            console.error('❌ Onboarding profile update failed:', err);
            // Still update local state so user isn't stuck
            const updatedUser = { ...user, role: data.userType, is_onboarded: true };
            setUser(updatedUser);
            localStorage.setItem('boq_pro_profile', JSON.stringify(updatedUser));
        } finally {
            // Guarantee navigation to dashboard
            setView('app');
        }
    };

    const handleSendMagicLink = async () => {
        // Firebase doesn't natively support magic links in the same way
        // Redirect to regular login
        setAuthError('Please use email and password to sign in.');
        return false;
    };

    const handleSelectPlan = async (plan) => {
        setAuthError(null);

        if (user) {
            try {
                const result = await updateProfile({ plan });
                if (result) {
                    setUser(prev => ({ ...prev, ...result }));
                    localStorage.setItem('boq_pro_profile', JSON.stringify({ ...user, ...result }));
                } else {
                    setUser(prev => ({ ...prev, plan }));
                }
                setView('app');
            } catch (err) {
                console.error('❌ Plan selection error:', err);
                setUser(prev => ({ ...prev, plan }));
                setView('app');
            }
        } else {
            setSelectedPlan(plan);
            setView('signup');
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error('❌ Logout error:', err);
        } finally {
            // Guarantee local cleanup and navigation
            localStorage.removeItem('boq_pro_profile');
            setUser(null);
            setView('landing');
        }
    };

    const value = {
        user,
        setUser,
        pendingUser,
        verificationEmailStatus,
        view,
        setView: navigateTo,
        authError,
        setAuthError,
        selectedPlan,
        handleLogin,
        handleSignUp,
        handleResendCode,
        handleOnboardingComplete,
        handleSendMagicLink,
        handleSelectPlan,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
