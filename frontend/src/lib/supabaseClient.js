import { createClient } from '@supabase/supabase-js';

// Using credentials provided by user
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

let supabaseInstance;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("Missing or invalid Supabase credentials. Running in offline mode.");

    // Create a proper mock that mimics Supabase client behavior
    supabaseInstance = {
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: (callback) => {
                // Call callback immediately with no session
                setTimeout(() => callback('SIGNED_OUT', null), 0);
                return {
                    data: {
                        subscription: {
                            unsubscribe: () => { }
                        }
                    }
                };
            },
            signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
            signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
            signOut: () => Promise.resolve({ error: null }),
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    single: () => Promise.resolve({ data: null, error: null }),
                    order: () => ({
                        limit: () => Promise.resolve({ data: [], error: null })
                    })
                }),
                order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null })
                })
            }),
            insert: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
            update: () => ({
                eq: () => ({
                    select: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } })
                })
            })
        })
    };
}

export const supabase = supabaseInstance;
