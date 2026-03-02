import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '../db/supabase';
import { getProfile, updateProfile } from '../db/database';
import { PLAN_NAMES } from '../data/plans';

const AuthContext = createContext(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('loading');
    const [authError, setAuthError] = useState(null);
    const [pendingUser, setPendingUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const initializationComplete = useRef(false);

    // Auto-clear auth errors on view changes
    const navigateTo = (newView) => {
        setAuthError(null);
        setView(newView);
    };

    // Check for active session on mount
    useEffect(() => {
        let isMounted = true;

        const checkUser = async () => {
            try {
                console.log('🔄 INITIALIZING AUTH...');

                // 1. FAST PATH: UI Caching
                const cachedProfile = localStorage.getItem('boq_pro_profile');
                if (cachedProfile) {
                    try {
                        const parsed = JSON.parse(cachedProfile);
                        console.log('✨ Using cached profile:', parsed.full_name);
                        setUser(parsed);
                        setView('app');
                    } catch {
                        localStorage.removeItem('boq_pro_profile');
                    }
                }

                // 2. SESSION CHECK (Silent)
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session) {
                    console.log('✅ Active session found:', session.user.email);
                    const profile = await getProfile(session.user.id);
                    const fullUser = { ...session.user, ...profile };
                    setUser(fullUser);
                    localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
                    initializationComplete.current = true;
                    setView('app');
                } else {
                    console.log('ℹ️ No active session');
                    localStorage.removeItem('boq_pro_profile');
                    setUser(null);
                    initializationComplete.current = true;
                    setView(prev => prev === 'loading' ? 'landing' : prev);
                }
            } catch (err) {
                console.error('❌ Init error:', err);
                initializationComplete.current = true;
                setView('landing');
            }
        };

        checkUser();

        // 3. AUTH STATE LISTENER (Global)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 AUTH EVENT:', event, !!session);
            if (!isMounted) return;

            if (session) {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    const profile = await getProfile(session.user.id);
                    const fullUser = { ...session.user, ...profile };
                    setUser(fullUser);
                    localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));
                    initializationComplete.current = true;

                    if (profile && profile.is_onboarded) {
                        setView('app');
                    } else {
                        setView('onboarding');
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('boq_pro_profile');
                setUser(null);
                setView('landing');
            }
        });

        // Fallback if still loading after 5 seconds
        const timer = setTimeout(() => {
            if (isMounted && !initializationComplete.current) {
                console.warn('Initialization timed out, falling back to landing');
                setView('landing');
            }
        }, 5000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const handleLogin = async (credentials) => {
        setAuthError(null);
        console.log('🚀 Attempting login for:', credentials.email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
        });

        if (error) {
            console.error('❌ Login failed:', error.message);
            setAuthError(error.message);
            return;
        }

        if (data.session) {
            console.log('✅ Login successful, updating UI...');
            const profile = await getProfile(data.user.id);
            const fullUser = { ...data.user, ...profile };
            setUser(fullUser);
            localStorage.setItem('boq_pro_profile', JSON.stringify(fullUser));

            if (profile && profile.is_onboarded) {
                setView('app');
            } else {
                setView('onboarding');
            }
        }
    };

    const handleSignUp = async (data) => {
        setAuthError(null);
        console.log('🚀 Attempting Supabase Signup for:', data.email);

        try {
            const signupPromise = supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        company_name: data.companyName,
                        phone_number: data.phoneNumber,
                        plan: selectedPlan || PLAN_NAMES.FREE,
                    }
                }
            });

            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 10000));
            const result = await Promise.race([signupPromise, timeoutPromise]);

            if (result === 'TIMEOUT') {
                setAuthError('Signup is taking too long. This looks like a connection issue with Supabase.');
                return;
            }

            const { data: res, error } = result;

            if (error) {
                console.error('❌ Supabase Signup Error:', error.message);
                setAuthError(error.message);
                return;
            }

            if (res.user && res.session === null) {
                console.log('📬 Signup successful, email verification required.');
                setPendingUser(data);
                setView('verification');
            } else if (res.user && res.session) {
                console.log('✨ Signup successful, user logged in directly.');
                const profile = await getProfile(res.user.id);
                const fullUser = { ...res.user, ...profile };
                setUser(fullUser);

                if (profile && profile.is_onboarded) {
                    setView('app');
                } else {
                    setView('onboarding');
                }
            }
        } catch (err) {
            console.error('❌ Critical Signup Crash:', err);
            setAuthError('Could not reach verification server. Please check your internet connection.');
        }
    };

    const handleVerify = async (code) => {
        console.log('Verifying code with Supabase:', code);
        const { error } = await supabase.auth.verifyOtp({
            email: pendingUser?.email,
            token: code,
            type: 'signup'
        });

        if (error) {
            console.error('Supabase OTP verification failed:', error.message);
            return false;
        }
        return true;
    };

    const handleResendCode = async () => {
        if (!pendingUser) return;
        await supabase.auth.resend({
            type: 'signup',
            email: pendingUser.email,
        });
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

    const handleSendMagicLink = async (email) => {
        setAuthError(null);
        console.log('🚀 Sending Magic Link to:', email);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });

        if (error) {
            console.error('❌ Magic Link failed:', error.message);
            setAuthError(error.message);
            return false;
        }

        console.log('✅ Magic Link triggered successfully');
        return true;
    };

    const handleSelectPlan = async (plan) => {
        setAuthError(null);

        // 1. FAST PATH: Guest/Mock User Bypass
        if (user && (user.id?.startsWith('mock-') || user.email === 'guest@boqpro.com')) {
            console.log('✨ Local Plan Selection (Mock User)');
            const updated = { ...user, plan };
            setUser(updated);
            localStorage.setItem('boq_pro_profile', JSON.stringify(updated));
            setView('app');
            return;
        }

        if (user) {
            try {
                console.log('📡 Syncing plan selection with database:', plan);
                const profilePromise = updateProfile({ plan });
                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 4000));
                const result = await Promise.race([profilePromise, timeoutPromise]);

                if (result === 'TIMEOUT') {
                    console.warn('⚠️ DB Sync timed out, applying locally');
                    setAuthError('Connection sync slow. Plan saved locally.');
                    const localUpdate = { ...user, plan };
                    setUser(localUpdate);
                    localStorage.setItem('boq_pro_profile', JSON.stringify(localUpdate));
                    setTimeout(() => setView('app'), 1500);
                    return;
                }

                if (result) {
                    setUser(prev => ({ ...prev, ...result }));
                    setView('app');
                } else {
                    console.warn('⚠️ DB update failed, falling back to local');
                    const localUpdate = { ...user, plan };
                    setUser(localUpdate);
                    setView('app');
                }
            } catch (err) {
                console.error('❌ Plan selection crash:', err);
                const localUpdate = { ...user, plan };
                setUser(localUpdate);
                setView('app');
            }
        } else {
            setSelectedPlan(plan);
            setView('signup');
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setView('landing');
    };

    const value = {
        user,
        setUser,
        view,
        setView: navigateTo,  // consumers get auto-clearing navigation
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
