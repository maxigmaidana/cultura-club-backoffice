import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import { RoleGuard } from '@/presentation/features/auth/components/RoleGuard';
import { CreateTriviaForm } from '@/presentation/features/trivias/components/CreateTriviaForm';
import crestLogo from '@/assets/logo_cai.jpg';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CLUB: 'Admin del Club',
  ENTRENADOR: 'Entrenador',
};

export function HomePage() {
  const { profile, logout } = useAuth();
  const [showTriviaForm, setShowTriviaForm] = useState(false);

  const roleLabel = profile ? ROLE_LABELS[profile.role] ?? profile.role : '';

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src={crestLogo} alt="Escudo del Club" className="h-10 w-10 rounded-full" />
          <div>
            <h1 className="text-base font-bold leading-tight sm:text-lg">
              Backoffice del Club
            </h1>
            <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              {profile?.email}
              {profile && (
                <span className="rounded-full bg-[var(--brand-red)]/10 px-2 py-0.5 text-[0.7rem] font-medium text-[var(--brand-red)]">
                  {roleLabel}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          Cerrar sesión
        </Button>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
        <RoleGuard allowedRoles={['ADMIN_CLUB', 'SUPER_ADMIN']}>
          {!showTriviaForm && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold">Trivias</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Creá una nueva trivia para que los hinchas del club participen.
              </p>
              <Button
                className="mt-4 bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-dark)]"
                onClick={() => setShowTriviaForm(true)}
              >
                Generar trivia
              </Button>
            </div>
          )}
        </RoleGuard>

        {showTriviaForm && <CreateTriviaForm />}

        <RoleGuard allowedRoles={['ENTRENADOR']}>
          <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            Tu rol ({roleLabel}) todavía no tiene acciones disponibles en esta sección.
          </div>
        </RoleGuard>
      </main>
    </div>
  );
}
