import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
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
import { getProfile, updateProfile } from '../db/database';

const AuthContext = createContext(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}

export function AuthProvider({ children }) {
    // Initialize from cache for instant UI
    const cachedProfile = localStorage.getItem('boq_pro_profile');
    let initialUser = null;
    let initialView = 'loading';
    if (cachedProfile) {
        try {
            initialUser = JSON.parse(cachedProfile);
            initialView = 'app';
        } catch { /* ignore */ }
    }

    const [user, setUser] = useState(initialUser);
    const [view, setView] = useState(initialView);
    const [authError, setAuthError] = useState(null);
    const [pendingUser, setPendingUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const initializationComplete = useRef(false);

    // Auto-clear auth errors on view changes
    const navigateTo = (newView) => {
        setAuthError(null);
        setView(newView);
    };

    // Helper: fetch profile in background and hydrate user state
    const hydrateProfile = async (firebaseUser) => {
        try {
            const profile = await getProfile(firebaseUser.uid);
            if (profile) {
                const fullUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...profile
                };
                setUser(fullUser);
                localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
                // If not onboarded, redirect to onboarding
                if (!profile.is_onboarded) {
                    setView('onboarding');
                }
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
                // If we already have a cached user, skip blocking on Firestore
                const cached = localStorage.getItem('boq_pro_profile');
                if (cached) {
                    try {
                        const cachedUser = JSON.parse(cached);
                        if (cachedUser.id === firebaseUser.uid) {
                            setUser(cachedUser);
                            initializationComplete.current = true;
                            setView(cachedUser.is_onboarded ? 'app' : 'onboarding');
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
                        plan: 'Free'
                    };
                    setUser(basicUser);
                    localStorage.setItem('boq_pro_profile', JSON.stringify(basicUser));
                    initializationComplete.current = true;

                    // If we suspect they are already onboarded (or we just don't know), 
                    // prefer the dashboard over showing onboarding every time.
                    setView('app');
                }
            } else {
                // User is signed out
                localStorage.removeItem('boq_pro_profile');
                setUser(null);
                initializationComplete.current = true;
                setView(prev => prev === 'loading' ? 'landing' : prev);
            }
        });

        // Fallback timeout: only trigger if definitely not initialized AND no user detected
        const timer = setTimeout(() => {
            if (!initializationComplete.current && !auth.currentUser && !user) {
                console.warn('Initialization timed out - returning to landing');
                setView('landing');
                initializationComplete.current = true;
            }
        }, 8000); // Increased to 8s for slower networks

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [user]); // Re-evaluate if user changes to be safe

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
                is_onboarded: true
            };
            setUser(optimisticUser);
            localStorage.setItem('boq_pro_profile', JSON.stringify(optimisticUser));
            initializationComplete.current = true; // ⚡ IMPORTANT: Prevents the timeout from kicking us out
            setView('app');

            // Hydrate full profile in background (non-blocking)
            hydrateProfile(result.user);
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
        console.log('🚀 Attempting signup for:', data.email);

        try {
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
                    company_name: data.companyName,
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

            // Send verification email (non-blocking)
            try {
                await sendEmailVerification(result.user);
            } catch (emailErr) {
                console.warn('⚠️ Verification email failed:', emailErr.message);
            }

            setView('verification');
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

    const handleVerify = async () => {
        // Firebase handles email verification differently — send verification email
        try {
            if (pendingUser || auth.currentUser) {
                await sendEmailVerification(pendingUser || auth.currentUser);
            }
            return true;
        } catch (error) {
            console.error('Verification failed:', error.message);
            return false;
        }
    };

    const handleResendCode = async () => {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
        }
    };

    const handleOnboardingComplete = async (data) => {
        try {
            const updatedProfile = await updateProfile({
                role: data.userType,
                is_onboarded: true
            });
            if (updatedProfile) {
                setUser(prev => ({ ...prev, ...updatedProfile }));
            }
        } catch (err) {
            console.error('❌ Onboarding profile update failed:', err);
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
        view,
        setView: navigateTo,
        authError,
        setAuthError,
        selectedPlan,
        handleLogin,
        handleSignUp,
        handleVerify,
        handleResendCode,
        handleOnboardingComplete,
        handleSendMagicLink,
        handleSelectPlan,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
