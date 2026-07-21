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
    setPersistence,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { analytics } from '../db/firebase';
import { logEvent as logAnalyticsEvent } from 'firebase/analytics';
import { getProfile, updateProfile } from '../db/database';
import AuthContext from './auth-context';
import { useToast } from '../components/ui/useToast';
import { buildCompanyKey, deriveCompanyName } from '../utils/companyAccess';
import { verifyPendingPaystackCheckout } from '../utils/paystack';
import { PLAN_NAMES } from '../data/plans';
import {
    buildPendingSubscriptionSelection,
    buildSubscriptionProfileUpdate,
    clearPendingSubscription,
    getNormalizedPlanName,
    normalizeUserProfile,
    readPendingSubscription,
    savePendingSubscription,
} from '../utils/subscription';
import { isPaidPlan } from '../data/plans';

const PUBLIC_VIEWS = new Set(['landing', 'pricing', 'login', 'signup', 'forgot-password', 'terms', 'privacy']);

// One-time migration from old "boq_pro_" localStorage keys to "quantra_" keys.
// This ensures existing users don't lose cached profile or pending data after the rebrand.
if (typeof window !== 'undefined') {
    const migrations = [
        ['boq_pro_profile', 'quantra_profile'],
        ['boq_pro_pending_subscription', 'quantra_pending_subscription'],
        ['boq_pro_pending_payment', 'quantra_pending_payment'],
        ['boq_pro_pending_paystack_checkout', 'quantra_pending_paystack_checkout'],
    ];
    for (const [oldKey, newKey] of migrations) {
        const old = localStorage.getItem(oldKey);
        if (old && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, old);
            localStorage.removeItem(oldKey);
        }
    }
}

export function AuthProvider({ children }) {
    const toast = useToast();

    // Initialize from cache for instant UI
    const cachedProfile = localStorage.getItem('quantra_profile');
    const pendingSubscription = readPendingSubscription();
    let initialUser = null;
    let initialView = 'loading';
    if (cachedProfile) {
        try {
            initialUser = normalizeUserProfile(JSON.parse(cachedProfile));
        } catch { /* ignore */ }
    }

    const [user, setUser] = useState(initialUser);
    const [view, setView] = useState(initialView);
    const [authError, setAuthError] = useState(null);
    const [pendingUser, setPendingUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(pendingSubscription?.plan || null);
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

    // After a new account/profile is created for a signup that started from a paid
    // plan selection, re-verify the Paystack transaction with the server (now that
    // the user is authenticated). The server applies the plan via firebase-admin,
    // which is the only path Firestore rules allow to grant a paid plan — the
    // client is never trusted to write `plan`/`subscription` for itself.
    const reconcilePendingPaystackCheckout = async () => {
        try {
            await verifyPendingPaystackCheckout({ allowPending: true });
        } catch (err) {
            console.warn('⚠️ Could not reconcile pending Paystack checkout after signup:', err.message);
        } finally {
            clearPendingSubscription();
            setSelectedPlan(null);
        }
    };

    // Helper: fetch profile in background and hydrate user state
    // NOTE: This should NOT redirect to onboarding — it runs as a background
    // refresh after login. The onAuthStateChanged listener handles onboarding
    // redirection during initial load instead.
    const hydrateProfile = async (firebaseUser) => {
        try {
            const profile = await getProfile(firebaseUser.uid);
            if (profile) {
                let fullUser = normalizeUserProfile({
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...profile
                });
                fullUser.company_name = fullUser.company_name || deriveCompanyName({ companyName: fullUser.company_name, email: firebaseUser.email });
                fullUser.company_key = fullUser.company_key || buildCompanyKey({
                    companyKey: fullUser.company_key,
                    companyName: fullUser.company_name,
                    email: firebaseUser.email
                });

                // Check verification state and force verification view if false
                if (fullUser.is_verified === false) {
                    setView('verification');
                }

                // 🛡️ GUARD: Never let a stale Firestore fetch downgrade is_onboarded
                // If the user completed onboarding locally, preserve that status
                setUser(prev => {
                    if (prev?.is_onboarded && !fullUser.is_onboarded) {
                        const sameRole = prev?.role && fullUser.role && prev.role === fullUser.role;
                        if (sameRole) {
                            fullUser = { ...fullUser, is_onboarded: true };
                        }
                    }
                    const normalizedUser = normalizeUserProfile(fullUser);
                    // 🛡️ GUARD: Skip update if nothing changed (prevents infinite re-render loops)
                    if (prev && JSON.stringify(prev) === JSON.stringify(normalizedUser)) {
                        return prev;
                    }
                    localStorage.setItem('quantra_profile', JSON.stringify(normalizedUser));
                    return normalizedUser;
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

            if (firebaseUser) {
                // 🛡️ GUARD: If already initialized and on 'app', don't re-navigate
                // This prevents the loop where setUser -> re-fires listener -> re-navigates to onboarding
                if (initializationComplete.current) {
                    // Just silently refresh profile in background
                    hydrateProfile(firebaseUser);
                    return;
                }

                // If we already have a cached user, skip blocking on Firestore
                const cached = localStorage.getItem('quantra_profile');
                if (cached) {
                    try {
                        const cachedUser = JSON.parse(cached);
                        if (cachedUser.id === firebaseUser.uid) {
                            const normalizedCachedUser = normalizeUserProfile(cachedUser);
                            setUser(normalizedCachedUser);
                            initializationComplete.current = true;
                            if (normalizedCachedUser?.is_verified === false) {
                                setView('verification');
                            } else {
                                setView(normalizedCachedUser?.is_onboarded === false ? 'onboarding' : 'app');
                            }
                            // Silently refresh profile in background
                            hydrateProfile(firebaseUser);
                            return;
                        }
                    } catch { /* ignore bad cache */ }
                }

                // No cache hit — do a blocking fetch
                try {
                    const profile = await getProfile(firebaseUser.uid);
                    const fullUser = normalizeUserProfile({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        ...profile
                    });
                    fullUser.company_name = fullUser.company_name || deriveCompanyName({ companyName: fullUser.company_name, email: firebaseUser.email });
                    fullUser.company_key = fullUser.company_key || buildCompanyKey({
                        companyKey: fullUser.company_key,
                        companyName: fullUser.company_name,
                        email: firebaseUser.email
                    });
                    // 🛡️ GUARD: Skip update if nothing changed (prevents infinite re-render loops)
                    setUser(prev => {
                        if (prev && JSON.stringify(prev) === JSON.stringify(fullUser)) {
                            return prev;
                        }
                        localStorage.setItem('quantra_profile', JSON.stringify(fullUser));
                        return fullUser;
                    });
                    initializationComplete.current = true;

                    if (profile && profile.is_verified === false) {
                        setView('verification');
                    } else if (profile && profile.is_onboarded) {
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
                        plan: getNormalizedPlanName('Free'),
                        company_name: deriveCompanyName({ email: firebaseUser.email }),
                        company_key: buildCompanyKey({ email: firebaseUser.email })
                    };
                    const normalizedBasicUser = normalizeUserProfile(basicUser);
                    setUser(normalizedBasicUser);
                    localStorage.setItem('quantra_profile', JSON.stringify(normalizedBasicUser));
                    initializationComplete.current = true;

                    // If we suspect they are already onboarded (or we just don't know), 
                    // prefer the landing page — user will navigate from there.
                    setView('app');
                }
            } else {
                // User is signed out
                localStorage.removeItem('quantra_profile');
                setUser(null);
                setPendingUser(null);
                setSelectedPlan(readPendingSubscription()?.plan || null);
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
        const pendingSelection = readPendingSubscription();

        try {
            const result = await signInWithEmailAndPassword(
                auth,
                credentials.email,
                credentials.password
            );

            // Fetch profile to check verification / onboarding status
            const profile = await getProfile(result.user.uid);
            const fullUser = normalizeUserProfile({
                id: result.user.uid,
                email: result.user.email,
                ...profile
            });

            setUser(fullUser);
            localStorage.setItem('quantra_profile', JSON.stringify(fullUser));
            initializationComplete.current = true;

            if (profile && profile.is_verified === false) {
                setView('verification');
                // Automatically send code if unverified
                const token = await result.user.getIdToken();
                fetch('/api/send-verification-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(() => {});
            } else if (profile && profile.is_onboarded) {
                setView(pendingSelection?.plan && isPaidPlan(pendingSelection.plan) ? 'pricing' : 'app');
            } else {
                setView('onboarding');
            }

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

    const handleSSOLogin = async (providerName) => {
        setAuthError(null);
        const pendingSelection = readPendingSubscription();
 
        let provider;
        if (providerName === 'google') {
            provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
        } else if (providerName === 'microsoft') {
            provider = new OAuthProvider('microsoft.com');
            provider.addScope('User.Read');
        } else {
            setAuthError('Unsupported sign-in provider.');
            return;
        }
 
        try {
            const result = await signInWithPopup(auth, provider);
 
            // Fetch or bootstrap profile
            let profile = await getProfile(result.user.uid);
            
            if (!profile) {
                console.log(`Creating new Firestore profile for SSO user ${result.user.uid}`);
                const company_name = deriveCompanyName({ email: result.user.email });
                const company_key = buildCompanyKey({ email: result.user.email });
                const chosenPlan = getNormalizedPlanName(
                    pendingSelection?.plan || selectedPlan || PLAN_NAMES.STUDENT
                );
                const isPendingPaidPlan = isPaidPlan(chosenPlan);
                // A paid plan is never granted from client-trusted local state — Firestore
                // rules reject a client write that sets `plan`/`subscription` directly. New
                // profiles always start on Student; a real paid plan is only applied
                // server-side (via firebase-admin) once we re-verify the Paystack
                // transaction below, after the account (and profile) exist.
                const subscriptionUpdate = isPendingPaidPlan
                    ? {
                        plan: PLAN_NAMES.STUDENT,
                        pendingSubscriptionSelection: buildPendingSubscriptionSelection({
                            planName: chosenPlan,
                            billingCycle: pendingSelection?.billing || 'monthly',
                        }),
                    }
                    : {};

                profile = {
                    full_name: result.user.displayName || 'Practitioner',
                    company_name,
                    company_key,
                    email: result.user.email,
                    is_onboarded: false,
                    is_verified: true, // OAuth providers have verified emails
                    ...subscriptionUpdate,
                };

                await updateProfile(profile);
                if (isPendingPaidPlan) {
                    await reconcilePendingPaystackCheckout();
                } else {
                    clearPendingSubscription();
                    setSelectedPlan(null);
                }
            }
 
            const fullUser = normalizeUserProfile({
                id: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                ...profile
            });
 
            setUser(fullUser);
            localStorage.setItem('quantra_profile', JSON.stringify(fullUser));
            initializationComplete.current = true;
 
            if (profile && profile.is_verified === false) {
                setView('verification');
                const token = await result.user.getIdToken();
                fetch('/api/send-verification-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(() => {});
            } else if (profile && profile.is_onboarded) {
                setView(pendingSelection?.plan && isPaidPlan(pendingSelection.plan) ? 'pricing' : 'app');
            } else {
                setView('onboarding');
            }
 
            if (analytics) {
                logAnalyticsEvent(analytics, 'login', { method: providerName });
            }
        } catch (error) {
            console.error(`❌ ${providerName} SSO login failed:`, error.message);
            if (error.code === 'auth/popup-closed-by-user') return;
            const messages = {
                'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
                'auth/cancelled-popup-request': 'Sign-in was cancelled.',
                'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups and try again.',
            };
            const errorDetails = error.code ? `[${error.code}]` : `(${error.message})`;
            setAuthError(messages[error.code] || `Unable to sign in with ${providerName === 'google' ? 'Google' : 'Microsoft'} ${errorDetails}. Please try again.`);
        }
    };

    const handleSignUp = async (data) => {
        setAuthError(null);
        setVerificationEmailStatus('idle');

        try {
            const company_name = deriveCompanyName({ companyName: data.companyName, email: data.email });
            const company_key = buildCompanyKey({ companyName: company_name, email: data.email });
            const pendingSelection = readPendingSubscription();
            const chosenPlan = getNormalizedPlanName(
                pendingSelection?.plan || selectedPlan || PLAN_NAMES.STUDENT
            );
            const isPendingPaidPlan = isPaidPlan(chosenPlan);
            // See the SSO signup handler above for why a paid plan is never written
            // from client state directly: it's applied server-side after re-verification.
            const subscriptionUpdate = isPendingPaidPlan
                ? {
                    plan: PLAN_NAMES.STUDENT,
                    pendingSubscriptionSelection: buildPendingSubscriptionSelection({
                        planName: chosenPlan,
                        billingCycle: pendingSelection?.billing || 'monthly',
                    }),
                }
                : {};

            const result = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );

            // Update Firebase Auth display name
            await updateAuthProfile(result.user, {
                displayName: data.fullName
            });

            // Create profile in Firestore (non-blocking)
            try {
                await updateProfile({
                    full_name: data.fullName,
                    company_name,
                    company_key,
                    phone_number: data.phoneNumber,
                    email: data.email,
                    is_onboarded: false,
                    is_verified: false, // New signup starts as unverified
                    ...subscriptionUpdate,
                });
                if (isPendingPaidPlan) {
                    await reconcilePendingPaystackCheckout();
                } else {
                    clearPendingSubscription();
                    setSelectedPlan(null);
                }
            } catch (profileErr) {
                console.warn('⚠️ Firestore profile creation failed (will retry later):', profileErr.message);
            }

            setPendingUser(result.user);
            initializationComplete.current = true; // ⚡ Prevent timeout on signup path

            setView('verification');

            try {
                // Call Resend verification code API
                const token = await result.user.getIdToken();
                const res = await fetch('/api/send-verification-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                const resData = await res.json();
                if (!res.ok) {
                    throw new Error(resData.error || 'Failed to send verification code.');
                }

                setVerificationEmailStatus('sent');
                toast.success(`Verification code sent to ${result.user.email}.`);
            } catch (emailErr) {
                console.warn('⚠️ Verification email failed:', emailErr.message);
                setVerificationEmailStatus('failed');
                setAuthError(emailErr.message || 'Your account was created, but we could not send the verification code. Please click "Resend Code" to try again.');
                toast.error('Account created, but verification code could not be sent.');
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
                const token = await targetUser.getIdToken();
                const res = await fetch('/api/send-verification-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await res.json();
                if (!res.ok) {
                    setVerificationEmailStatus('failed');
                    setAuthError(data.error || 'Failed to send verification code.');
                    toast.error(data.error || 'Verification code could not be sent.');
                    return;
                }

                setVerificationEmailStatus('sent');
                toast.success(`Verification code sent to ${targetUser.email}.`);
            } catch (err) {
                console.error('❌ Failed to resend verification code:', err.message);
                setVerificationEmailStatus('failed');
                setAuthError('We could not send the verification code right now. Please try again later.');
                toast.error('Verification code could not be sent.');
            }
        }
    };

    const handleVerifyCode = async (code) => {
        setAuthError(null);
        const targetUser = auth.currentUser || pendingUser;
        if (!targetUser) {
            setAuthError('No active authentication session found.');
            return false;
        }

        try {
            const token = await targetUser.getIdToken();
            const res = await fetch('/api/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code })
            });

            const data = await res.json();
            if (!res.ok) {
                setAuthError(data.error || 'Verification failed.');
                return false;
            }

            // Sync successful verification state
            setUser(prev => {
                const updated = normalizeUserProfile({ ...prev, is_verified: true });
                localStorage.setItem('quantra_profile', JSON.stringify(updated));
                return updated;
            });

            toast.success('Email verified successfully!');
            
            // Redirect to onboarding or app
            const profile = await getProfile(targetUser.uid);
            if (profile && profile.is_onboarded) {
                setView('app');
            } else {
                setView('onboarding');
            }
            return true;
        } catch (err) {
            console.error('❌ Verification failed:', err.message);
            setAuthError(err.message || 'Verification failed. Please try again.');
            return false;
        }
    };

    const handleOnboardingComplete = async (data) => {
        try {
            const updatedProfile = await updateProfile({
                role: data.userType,
                is_onboarded: true
            });
            if (updatedProfile) {
                const updatedUser = normalizeUserProfile({ ...user, ...updatedProfile, is_onboarded: true });
                setUser(updatedUser);
                localStorage.setItem('quantra_profile', JSON.stringify(updatedUser));
            } else {
                // Even if Firestore update didn't return data, update local state
                const updatedUser = normalizeUserProfile({ ...user, role: data.userType, is_onboarded: true });
                setUser(updatedUser);
                localStorage.setItem('quantra_profile', JSON.stringify(updatedUser));
            }
        } catch (err) {
            console.error('❌ Onboarding profile update failed:', err);
            // Still update local state so user isn't stuck
            const updatedUser = normalizeUserProfile({ ...user, role: data.userType, is_onboarded: true });
            setUser(updatedUser);
            localStorage.setItem('quantra_profile', JSON.stringify(updatedUser));
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

    const handleSelectPlan = async (plan, paystackData) => {
        setAuthError(null);
        const normalizedPlan = getNormalizedPlanName(plan);
        const billingCycle = paystackData?.billing || 'monthly';
        const isVerifiedPayment = paystackData?.verified === true;

        if (user) {
            if (isPaidPlan(normalizedPlan) && !isVerifiedPayment) {
                savePendingSubscription({
                    planName: normalizedPlan,
                    billing: billingCycle,
                    paystackData: null,
                });
                setSelectedPlan(normalizedPlan);
                setView('pricing');
                return;
            }

            try {
                if (isVerifiedPayment && paystackData?.profile) {
                    const normalizedUser = normalizeUserProfile({
                        ...user,
                        ...paystackData.profile,
                        pendingSubscriptionSelection: null,
                    });
                    setUser(normalizedUser);
                    localStorage.setItem('quantra_profile', JSON.stringify(normalizedUser));
                } else {
                    const profileUpdate = buildSubscriptionProfileUpdate({
                        planName: normalizedPlan,
                        billingCycle,
                        paystackData,
                        existingProfile: user,
                    });
                    const result = await updateProfile({
                        ...profileUpdate,
                        pendingSubscriptionSelection: null,
                    });
                    const normalizedUser = normalizeUserProfile({ ...user, ...(result || profileUpdate), pendingSubscriptionSelection: null });
                    setUser(normalizedUser);
                    localStorage.setItem('quantra_profile', JSON.stringify(normalizedUser));
                }
                clearPendingSubscription();
                setSelectedPlan(null);
                setView('app');
            } catch (err) {
                console.error('❌ Plan selection error:', err);
                if (isVerifiedPayment) {
                    const normalizedUser = normalizeUserProfile({
                        ...user,
                        ...buildSubscriptionProfileUpdate({
                            planName: normalizedPlan,
                            billingCycle,
                            paystackData,
                            existingProfile: user,
                        }),
                        pendingSubscriptionSelection: null,
                    });
                    setUser(normalizedUser);
                    localStorage.setItem('quantra_profile', JSON.stringify(normalizedUser));
                    clearPendingSubscription();
                    setSelectedPlan(null);
                    setView('app');
                } else {
                    setAuthError(err.message || 'Unable to start plan checkout.');
                }
            }
        } else {
            // User not logged in — store plan choice and go to signup
            setSelectedPlan(normalizedPlan);
            savePendingSubscription({
                planName: normalizedPlan,
                billing: billingCycle,
                paystackData,
            });
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
            localStorage.removeItem('quantra_profile');
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
        handleSSOLogin,
        handleSignUp,
        handleResendCode,
        handleVerifyCode,
        handleOnboardingComplete,
        handleSendMagicLink,
        handleSelectPlan,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
