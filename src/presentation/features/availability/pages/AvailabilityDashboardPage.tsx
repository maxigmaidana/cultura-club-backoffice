import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Search, Stethoscope } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import { getPlayersForAvailabilityUseCase } from '@/presentation/features/availability/services/availabilityDependencies';
import {
  availabilityStateLabel,
  availabilityStateVariant,
  getAvailabilityState,
} from '@/presentation/features/availability/utils/availabilityUi';
import type { PlayerForAvailability } from '@/domain/entities/availability/Availability';

const ALLOWED_ROLES = ['ENTRENADOR', 'ADMIN_CLUB', 'SUPER_ADMIN', 'DOCTOR'] as const;

type StatusFilter = 'ALL' | 'NOT_AVAILABLE' | 'FOLLOW_UP' | 'AVAILABLE';

function isAllowedRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);
}

export function AvailabilityDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [players, setPlayers] = useState<PlayerForAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!profile) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data = await getPlayersForAvailabilityUseCase.execute({
          role: profile.role,
          requesterId: profile.id,
          clubId: profile.club_id,
          search,
          categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
        });

        setPlayers(data);
      } catch (err) {
        console.error('Error al obtener jugadores para disponibilidad:', err);
        const message = err instanceof Error ? err.message : 'No se pudo cargar la disponibilidad.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [profile, search, categoryFilter]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();

    players.forEach((player) => {
      if (player.categoriaId) {
        map.set(player.categoriaId, player.categoriaNombre);
      }
    });

    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const state = getAvailabilityState(player.availability);

      if (statusFilter === 'ALL') {
        return true;
      }

      if (statusFilter === 'NOT_AVAILABLE') {
        return state === 'NOT_AVAILABLE' || state === 'TRAINING_RESTRICTION';
      }

      if (statusFilter === 'FOLLOW_UP') {
        return state === 'FOLLOW_UP' || state === 'TRAINING_RESTRICTION';
      }

      return state === 'AVAILABLE';
    });
  }, [players, statusFilter]);

  if (profile && !isAllowedRole(profile.role)) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold sm:text-lg">Disponibilidad de jugadores</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona lesiones, restricciones y seguimiento medico de cada jugador.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
            Volver al Home
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-muted-foreground">Categoria</label>
              <Select value={categoryFilter} onValueChange={(value: unknown) => setCategoryFilter((value as string | null) ?? 'ALL')}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === 'ALL') {
                        return 'Todas';
                      }

                      return categories.find((category) => category.id === value)?.nombre ?? 'Todas';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-muted-foreground">Estado</label>
              <Select
                value={statusFilter}
                onValueChange={(value: unknown) => setStatusFilter((value as StatusFilter) ?? 'ALL')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value || value === 'ALL') {
                        return 'Todos';
                      }

                      if (value === 'NOT_AVAILABLE') {
                        return 'No disponibles';
                      }

                      if (value === 'FOLLOW_UP') {
                        return 'Con seguimiento';
                      }

                      return 'Disponibles';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="NOT_AVAILABLE">No disponibles</SelectItem>
                  <SelectItem value="FOLLOW_UP">Con seguimiento</SelectItem>
                  <SelectItem value="AVAILABLE">Disponibles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">No se pudo cargar el panel</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={`skeleton-${index}`} className="space-y-3 p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </Card>
            ))}
          </div>
        ) : filteredPlayers.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No hay jugadores que coincidan con los filtros seleccionados.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlayers.map((player) => {
              const state = getAvailabilityState(player.availability);
              const variant = availabilityStateVariant(state);

              return (
                <Card
                  key={player.userId}
                  className="cursor-pointer border-l-4 border-l-primary p-4 transition hover:shadow-sm"
                  onClick={() => navigate(`/availability/players/${player.userId}`)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">{player.nombreCompleto}</h3>
                        <p className="text-xs text-muted-foreground">{player.categoriaNombre}</p>
                      </div>
                      <Badge variant={variant}>{availabilityStateLabel(state)}</Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        {player.posiciones.length > 0 ? player.posiciones.join(', ') : 'Posicion sin cargar'}
                        {player.sectorCancha ? ` · ${player.sectorCancha}` : ''}
                      </p>
                      <p>
                        Lesiones activas:{' '}
                        <span className="font-medium text-foreground">
                          {player.availability.activeInjuriesCount}
                        </span>
                      </p>
                      <p>
                        Entrena: {player.availability.canTrain ? 'Si' : 'No'} · Juega:{' '}
                        {player.availability.canPlay ? 'Si' : 'No'}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
