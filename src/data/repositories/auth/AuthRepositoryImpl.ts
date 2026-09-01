import { supabase } from '@/data/datasources/supabase';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/domain/entities/auth/UserProfile';
import type { IAuthRepository } from '@/domain/repositories/auth/auth_repository';

export class AuthRepositoryImpl implements IAuthRepository {
  async login(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, rol, nombre_completo, club_id')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.rol,
      nombre: data.nombre_completo,
      club_id: data.club_id,
    };
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return () => data.subscription.unsubscribe();
  }
}
