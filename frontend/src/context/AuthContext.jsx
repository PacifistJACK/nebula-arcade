import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, username) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });
        if (error) throw error;
        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        console.log('[AuthContext] signOut called');
        const { error } = await supabase.auth.signOut();

        // Always clear local state, even if API call fails
        setUser(null);

        if (error) {
            console.warn('[AuthContext] Sign out API error (user cleared locally):', error);
            // Don't throw - we still logged out locally
        } else {
            console.log('[AuthContext] Sign out completed successfully');
        }
    };

    return (
        <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
