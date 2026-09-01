import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/domain/entities/auth/UserProfile';
import { AuthRepositoryImpl } from '@/data/repositories/auth/AuthRepositoryImpl';
import { LoginUseCase } from '@/aplication/use-cases/auth/LoginUseCase';
import { LogoutUseCase } from '@/aplication/use-cases/auth/LogoutUseCase';
import { GetCurrentUserUseCase } from '@/aplication/use-cases/auth/GetCurrentUserUseCase';

// Instanciamos las dependencias (en un proyecto más grande esto se inyecta con un Container)
const authRepository = new AuthRepositoryImpl();
const loginUseCase = new LoginUseCase(authRepository);
const logoutUseCase = new LogoutUseCase(authRepository);
const getCurrentUserUseCase = new GetCurrentUserUseCase(authRepository);

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUserUseCase
      .execute()
      .then(({ session: initialSession, profile: initialProfile }) => {
        setSession(initialSession);
        setProfile(initialProfile);
      })
      .catch((err) => {
        console.error('Error al obtener la sesión actual:', err);
        setSession(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));

    const unsubscribe = authRepository.onAuthStateChange((newSession) => {
      setSession(newSession);

      if (!newSession) {
        setProfile(null);
        return;
      }

      authRepository
        .getUserProfile(newSession.user.id)
        .then(setProfile)
        .catch((err) => {
          console.error('Error al obtener el perfil del usuario:', err);
          setProfile(null);
        });
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await loginUseCase.execute(email, password);
  };

  const logout = async () => {
    await logoutUseCase.execute();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
