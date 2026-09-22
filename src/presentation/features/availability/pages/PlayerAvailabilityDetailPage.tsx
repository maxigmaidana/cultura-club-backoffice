import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, PlusCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import {
  getPlayerAvailabilityUseCase,
  getPlayerUnavailabilitiesUseCase,
  getPlayersForAvailabilityUseCase,
} from '@/presentation/features/availability/services/availabilityDependencies';
import {
  availabilityStateLabel,
  availabilityStateVariant,
  bodySideLabel,
  getAvailabilityState,
  severityLabel,
  statusLabel,
} from '@/presentation/features/availability/utils/availabilityUi';
import type { PlayerForAvailability, PlayerUnavailability } from '@/domain/entities/availability/Availability';

const ALLOWED_ROLES = ['ENTRENADOR', 'ADMIN_CLUB', 'SUPER_ADMIN', 'DOCTOR'] as const;

function isAllowedRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);
}

export function PlayerAvailabilityDetailPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId: string }>();

  const profileId = profile?.id;
  const profileRole = profile?.role;
  const profileClubId = profile?.club_id;

  const [player, setPlayer] = useState<PlayerForAvailability | null>(null);
  const [injuries, setInjuries] = useState<PlayerUnavailability[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId || !profileRole || !playerId) {
        return;
      }

      try {
        if (!hasLoadedRef.current) {
          setInitialLoading(true);
        }
        setError(null);

        const [players, availability, playerInjuries] = await Promise.all([
          getPlayersForAvailabilityUseCase.execute({
            role: profileRole,
            requesterId: profileId,
            clubId: profileClubId,
          }),
          getPlayerAvailabilityUseCase.execute(playerId),
          getPlayerUnavailabilitiesUseCase.execute(playerId),
        ]);

        const selectedPlayer = players.find((item) => item.userId === playerId);
        if (!selectedPlayer) {
          throw new Error('No se encontro el jugador solicitado.');
        }

        setPlayer({
          ...selectedPlayer,
          availability,
        });
        setInjuries(playerInjuries);
      } catch (err) {
        console.error('Error al obtener detalle de disponibilidad del jugador:', err);
        const message = err instanceof Error ? err.message : 'No se pudo cargar el detalle del jugador.';
        setError(message);
      } finally {
        setInitialLoading(false);
        hasLoadedRef.current = true;
      }
    };

    void fetchData();
  }, [playerId, profileClubId, profileId, profileRole]);

  const activeInjuries = useMemo(
    () => injuries.filter((injury) => injury.status !== 'CLOSED'),
    [injuries]
  );
  const historicalInjuries = useMemo(
    () => injuries.filter((injury) => injury.status === 'CLOSED'),
    [injuries]
  );

  const availabilityState = player ? getAvailabilityState(player.availability) : null;

  if (profile && !isAllowedRole(profile.role)) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/availability')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </button>
          {playerId && (
            <Button onClick={() => navigate(`/availability/injuries/new?playerId=${playerId}`)}>
              <PlusCircle className="h-4 w-4" />
              Registrar lesion
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        {error && (
          <Card className="border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {initialLoading && !player ? (
          <Card className="space-y-3 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ) : player ? (
          <>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold">{player.nombreCompleto}</h1>
                  <p className="text-sm text-muted-foreground">
                    {player.categoriaNombre} · {player.sectorCancha || 'Sector sin cargar'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {player.posiciones.length > 0 ? player.posiciones.join(', ') : 'Posicion sin cargar'}
                  </p>
                </div>
                {availabilityState && (
                  <Badge variant={availabilityStateVariant(availabilityState)}>
                    {availabilityStateLabel(availabilityState)}
                  </Badge>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Puede entrenar</p>
                  <p className="text-sm font-semibold">{player.availability.canTrain ? 'Si' : 'No'}</p>
                </Card>
                <Card className="bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Puede jugar</p>
                  <p className="text-sm font-semibold">{player.availability.canPlay ? 'Si' : 'No'}</p>
                </Card>
                <Card className="bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Lesiones activas</p>
                  <p className="text-sm font-semibold">{player.availability.activeInjuriesCount}</p>
                </Card>
              </div>
            </Card>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Lesiones activas</h2>
                <Badge variant="outline">{activeInjuries.length}</Badge>
              </div>

              {activeInjuries.length === 0 ? (
                <Card className="border-dashed p-6 text-sm text-muted-foreground">
                  El jugador no tiene lesiones activas actualmente.
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {activeInjuries.map((injury) => (
                    <Card key={injury.id} className="space-y-3 border-l-4 border-l-primary p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{injury.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            Inicio: {new Date(injury.startDate).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                        <Badge variant="warning">{statusLabel(injury.status)}</Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Zona: {injury.bodyArea || 'Sin especificar'}</p>
                        <p>Lado: {bodySideLabel(injury.bodySide)}</p>
                        <p>Severidad: {severityLabel(injury.severity)}</p>
                        <p>
                          Entrena: {injury.canTrain ? 'Si' : 'No'} · Juega: {injury.canPlay ? 'Si' : 'No'}
                        </p>
                        <p>
                          Regreso estimado:{' '}
                          {injury.estimatedReturnDate
                            ? new Date(injury.estimatedReturnDate).toLocaleDateString('es-AR')
                            : 'Sin fecha'}
                        </p>
                      </div>

                      <Button variant="outline" onClick={() => navigate(`/availability/injuries/${injury.id}`)}>
                        Ver detalle
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Historial de lesiones</h2>
                <Badge variant="outline">{historicalInjuries.length}</Badge>
              </div>

              {historicalInjuries.length === 0 ? (
                <Card className="border-dashed p-6 text-sm text-muted-foreground">
                  Aun no hay lesiones cerradas para este jugador.
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {historicalInjuries.map((injury) => (
                    <Card key={injury.id} className="space-y-2 border-l-4 border-l-muted p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{injury.title}</h3>
                        <Badge variant="success">Alta medica</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Cerrada el{' '}
                        {injury.closedAt
                          ? new Date(injury.closedAt).toLocaleDateString('es-AR')
                          : 'sin fecha'}
                      </p>
                      <Button variant="outline" onClick={() => navigate(`/availability/injuries/${injury.id}`)}>
                        Ver detalle
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
