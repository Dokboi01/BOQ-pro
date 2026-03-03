import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { auth } from '../db/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile as updateAuthProfile
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
    const [pendingUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const initializationComplete = useRef(false);

    // Auto-clear auth errors on view changes
    const navigateTo = (newView) => {
        setAuthError(null);
        setView(newView);
    };

    // Firebase Auth State Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('🔐 AUTH STATE:', firebaseUser ? firebaseUser.email : 'signed out');

            if (firebaseUser) {
                // User is signed in — fetch or create profile
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
            } else {
                // User is signed out
                localStorage.removeItem('boq_pro_profile');
                setUser(null);
                initializationComplete.current = true;
                setView(prev => prev === 'loading' ? 'landing' : prev);
            }
        });

        // Fallback timeout
        const timer = setTimeout(() => {
            if (!initializationComplete.current) {
                console.warn('Initialization timed out');
                setView('landing');
            }
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const handleLogin = async (credentials) => {
        setAuthError(null);
        console.log('🚀 Attempting login for:', credentials.email);

        try {
            const result = await signInWithEmailAndPassword(
                auth,
                credentials.email,
                credentials.password
            );

            console.log('✅ Login successful:', result.user.email);
            // onAuthStateChanged will handle the rest
        } catch (error) {
            console.error('❌ Login failed:', error.message);
            // Map Firebase error codes to friendly messages
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

            // Create profile in Firestore
            await updateProfile({
                full_name: data.fullName,
                company_name: data.companyName,
                phone_number: data.phoneNumber,
                plan: selectedPlan || 'Free',
                email: data.email,
                is_onboarded: false
            });

            console.log('✅ Signup successful:', result.user.email);
            // onAuthStateChanged will handle navigation
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
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
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
        const updatedProfile = await updateProfile({
            role: data.userType,
            is_onboarded: true
        });
        if (updatedProfile) {
            setUser(prev => ({ ...prev, ...updatedProfile }));
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
        await signOut(auth);
        localStorage.removeItem('boq_pro_profile');
        setUser(null);
        setView('landing');
    };

    const value = {
        user,
        setUser,
        view,
        setView: navigateTo,
        authError,
        setAuthError,
        pendingUser,
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
