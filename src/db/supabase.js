import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
    console.warn('Supabase credentials are not fully configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

let supabase;

try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('YOUR_')) {
        throw new Error('Supabase credentials are not configured');
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
    console.error('FAILED TO INITIALIZE SUPABASE:', err.message);
    // Create a dummy object to avoid crashes on import, though it won't work
    supabase = {
        auth: { getSession: async () => ({ data: { session: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null, error: null }) }) }) })
    };
}

export { supabase };
