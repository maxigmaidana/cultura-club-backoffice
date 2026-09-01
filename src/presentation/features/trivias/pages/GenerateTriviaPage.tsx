import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import { CreateTriviaForm } from '@/presentation/features/trivias/components/CreateTriviaForm';

export function GenerateTriviaPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Defensa extra además del RBAC del botón en HomePage: si el rol no puede generar trivias, lo mandamos de vuelta.
  if (profile && profile.role !== 'ADMIN_CLUB' && profile.role !== 'SUPER_ADMIN') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold sm:text-lg">Generar trivia</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
          Volver al Home
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <CreateTriviaForm />
      </main>
    </div>
  );
}
