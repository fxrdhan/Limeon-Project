import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserDetails {
    id: string;
    name: string;
    email: string;
    profilephoto: string | null;
    role: string;
}

interface AuthState {
    session: Session | null;
    user: UserDetails | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfilePhoto: (photoBase64: string) => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
                    .select('id, name, email, role, profilephoto')
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
                .select('id, name, email, role, profilephoto')
                .eq('id', data.user?.id)
                .single();

            set({
                session: data.session,
                user: userData,
                loading: false
            });
        } catch (error: unknown) {
            console.error('Login error:', error);
            set({ error: error instanceof Error ? error.message : 'An unknown error occurred', loading: false });
        }
    },

    logout: async () => {
        try {
            set({ loading: true });
            await supabase.auth.signOut();
            set({ session: null, user: null, loading: false });
        } catch (error: unknown) {
            console.error('Logout error:', error);
            set({ error: error instanceof Error ? error.message : 'An unknown error occurred', loading: false });
        }
    },

    updateProfilePhoto: async (photoBase64) => {
        const { user, session } = get();
        if (!session || !user) {
            set({ error: 'User not authenticated', loading: false });
            return;
        }
        set({ loading: true, error: null });
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ profilephoto: photoBase64, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            if (updateError) throw updateError;
            set((state) => ({ user: state.user ? { ...state.user, profilephoto: photoBase64 } : null, loading: false }));
        } catch (error: unknown) {
            set({ error: error instanceof Error ? error.message : 'Failed to update profile photo', loading: false });
        }
    }
}));