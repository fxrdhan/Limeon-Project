import { supabase } from '@/lib/supabase';

// Auth flows should share the app-wide Supabase singleton. Creating a second
// browser client produces duplicate GoTrueClient instances and session storage
// contention under the same auth storage key.
export const authSupabase = supabase;
