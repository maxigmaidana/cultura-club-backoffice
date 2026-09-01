import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/domain/entities/auth/UserProfile';

export interface IAuthRepository {
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  getSession(): Promise<Session | null>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}
