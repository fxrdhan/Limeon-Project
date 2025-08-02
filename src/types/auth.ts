import { Session } from '@supabase/supabase-js';
import { UserDetails } from './database';

// Authentication types
export interface AuthState {
  session: Session | null;
  user: UserDetails | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfilePhoto: (file: File) => Promise<void>;
  initialize: () => Promise<void>;
}

export type ProfileKey = keyof import('./database').CompanyProfile;
