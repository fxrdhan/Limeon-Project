/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
    session: Session | null;
    user: any | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    loading: true,
    error: null,

    initialize: async () => {
        try {
            const { data } = await supabase.auth.getSession();

            if (data.session) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .single();

                set({
                    session: data.session,
                    user: userData,
                    loading: false
                });
            } else {
                set({ loading: false });
            }
        } catch (error) {
            console.error('Error initializing auth:', error);
            set({ loading: false });
        }
    },

    login: async (email, password) => {
        try {
            set({ loading: true, error: null });

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user?.id)
                .single();

            set({
                session: data.session,
                user: userData,
                loading: false
            });
        } catch (error: any) {
            console.error('Login error:', error);
            set({ error: error.message, loading: false });
        }
    },

    logout: async () => {
        try {
            set({ loading: true });
            await supabase.auth.signOut();
            set({ session: null, user: null, loading: false });
        } catch (error: any) {
            console.error('Logout error:', error);
            set({ error: error.message, loading: false });
        }
    }
}));