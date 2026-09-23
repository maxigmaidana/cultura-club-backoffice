import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

import { AlertDialog } from '@/components/ui/alert-dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import {
  createInjuryUseCase,
  getPlayerForAvailabilityUseCase,
  getPlayerUnavailabilitiesUseCase,
} from '@/presentation/features/availability/services/availabilityDependencies';
import {
  bodySideLabel,
  formatDateOnly,
  severityLabel,
} from '@/presentation/features/availability/utils/availabilityUi';
import type {
  BodySide,
  CreateInjuryInput,
  InjurySeverity,
  PlayerAvailabilityContext,
  PlayerUnavailability,
} from '@/domain/entities/availability/Availability';

type InjuryFormState = Omit<CreateInjuryInput, 'playerId'>;

const ALLOWED_ROLES = ['ENTRENADOR', 'ADMIN_CLUB', 'SUPER_ADMIN', 'DOCTOR'] as const;

function isAllowedRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);
}

const BODY_SIDE_OPTIONS: BodySide[] = ['LEFT', 'RIGHT', 'BILATERAL', 'NOT_APPLICABLE'];
const SEVERITY_OPTIONS: InjurySeverity[] = ['MILD', 'MODERATE', 'SEVERE'];

function sanitizeCreationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid input syntax for type date') || normalized.includes('sqlstate')) {
    return 'No se pudo registrar la lesion. Revisa los datos e intenta nuevamente.';
  }

  return message;
}

export function CreateInjuryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fixedPlayerId = (searchParams.get('playerId') ?? '').trim();

  const doctorMode = profile?.role === 'DOCTOR';
  const profileId = profile?.id;
  const profileRole = profile?.role;
  const profileClubId = profile?.club_id;

  const [player, setPlayer] = useState<PlayerAvailabilityContext | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [closedInjuries, setClosedInjuries] = useState<PlayerUnavailability[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [form, setForm] = useState<InjuryFormState>({
    title: '',
    startDate: '',
    description: '',
    bodyArea: '',
    bodySide: 'NOT_APPLICABLE',
    severity: 'MODERATE',
    staffNotes: '',
    relapseOfId: '',
    canTrain: false,
    canPlay: false,
    estimatedReturnDate: '',
    playerNotes: '',
    sportsRecommendations: '',
    diagnosis: '',
    clinicalNotes: '',
    treatmentPlan: '',
    rehabilitationPlan: '',
    medicalRecommendations: '',
  });

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!profileId || !profileRole || !fixedPlayerId) {
        return;
      }

      try {
        setLoadingPlayer(true);
        const data = await getPlayerForAvailabilityUseCase.execute({
          role: profileRole,
          requesterId: profileId,
          clubId: profileClubId,
          playerId: fixedPlayerId,
        });

        setPlayer(data);
      } catch (err) {
        console.error('Error al obtener jugador para registrar lesion:', err);
        const message = err instanceof Error ? err.message : 'No se pudo cargar el jugador.';
        setError(message);
      } finally {
        setLoadingPlayer(false);
      }
    };

    void fetchPlayer();
  }, [fixedPlayerId, profileClubId, profileId, profileRole]);

  useEffect(() => {
    const fetchClosedInjuries = async () => {
      if (!fixedPlayerId) {
        setClosedInjuries([]);
        return;
      }

      try {
        const injuries = await getPlayerUnavailabilitiesUseCase.execute(fixedPlayerId);
        setClosedInjuries(injuries.filter((injury) => injury.status === 'CLOSED'));
      } catch (err) {
        console.error('Error al obtener lesiones cerradas para recaidas:', err);
      }
    };

    void fetchClosedInjuries();
  }, [fixedPlayerId]);

  if (profile && !isAllowedRole(profile.role)) {
    return <Navigate to="/home" replace />;
  }

  const validateForm = (): boolean => {
    setError(null);

    if (!fixedPlayerId) {
      setError('No se pudo identificar al jugador.');
      return false;
    }

    if (!form.title.trim()) {
      setError('El titulo de la lesion es obligatorio.');
      return false;
    }

    if (!form.startDate) {
      setError('La fecha de inicio es obligatoria.');
      return false;
    }

    if (form.estimatedReturnDate && form.estimatedReturnDate < form.startDate) {
      setError('La fecha estimada de regreso no puede ser anterior a la fecha de inicio.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setDialogError(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = async () => {
    if (saving) {
      return;
    }

    if (!validateForm()) {
      setShowConfirmDialog(false);
      return;
    }

    if (!profile) {
      setError('No se pudo identificar el usuario autenticado.');
      return;
    }

    try {
      setSaving(true);
      setDialogError(null);

      await createInjuryUseCase.execute(
        {
          playerId: fixedPlayerId,
          title: form.title.trim(),
          startDate: form.startDate,
          description: form.description,
          bodyArea: form.bodyArea,
          bodySide: form.bodySide,
          severity: form.severity,
          staffNotes: form.staffNotes,
          relapseOfId: form.relapseOfId || undefined,
          playerNotes: doctorMode ? form.playerNotes : undefined,
          sportsRecommendations: doctorMode ? form.sportsRecommendations : undefined,
          estimatedReturnDate: doctorMode ? form.estimatedReturnDate : undefined,
          canTrain: doctorMode ? form.canTrain : undefined,
          canPlay: doctorMode ? form.canPlay : undefined,
          diagnosis: doctorMode ? form.diagnosis : undefined,
          clinicalNotes: doctorMode ? form.clinicalNotes : undefined,
          treatmentPlan: doctorMode ? form.treatmentPlan : undefined,
          rehabilitationPlan: doctorMode ? form.rehabilitationPlan : undefined,
          medicalRecommendations: doctorMode ? form.medicalRecommendations : undefined,
        },
        profile.role
      );

      setShowConfirmDialog(false);
      navigate('/availability', { state: { injuryCreated: true } });
    } catch (err) {
      console.error('Error al crear lesion:', err);
      const message = err instanceof Error ? err.message : 'No se pudo registrar la lesion.';
      const sanitizedMessage = sanitizeCreationError(message);
      setDialogError(sanitizedMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!fixedPlayerId) {
    return (
      <div className="min-h-[100svh] bg-background">
        <div className="h-1 w-full bg-[var(--brand-red)]" />
        <header className="border-b px-4 py-4 sm:px-6">
          <button
            onClick={() => navigate('/availability')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </header>

        <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
          <Card className="border border-destructive/40 bg-destructive/5 p-5">
            <p className="text-sm font-semibold text-destructive">No se pudo identificar al jugador.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volve al panel de disponibilidad y selecciona un jugador.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/availability')}>
                Volver a disponibilidad
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="border-b px-4 py-4 sm:px-6">
        <button
          onClick={() => navigate(fixedPlayerId ? `/availability/players/${fixedPlayerId}` : '/availability')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <Card className="p-5">
          <h1 className="text-lg font-semibold">Registrar lesion</h1>
          <p className="text-sm text-muted-foreground">
            Completa la informacion inicial para abrir el seguimiento medico del jugador.
          </p>
        </Card>

        {error && (
          <Card className="border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">No se pudo registrar la lesion</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Card className="space-y-4 p-5">
            <h2 className="text-base font-semibold">Informacion general</h2>
            <p className="text-xs text-muted-foreground">* Campos obligatorios</p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Jugador</label>
                <Card className="space-y-1 border-l-4 border-l-primary p-4">
                  <p className="text-base font-semibold text-foreground">
                    {loadingPlayer ? 'Cargando jugador...' : player?.nombreCompleto || 'Jugador sin nombre'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {player
                      ? `${player.categoriaNombre} · ${player.posiciones.join(', ') || 'Posicion sin cargar'}`
                      : 'Sin datos de categoria/posicion'}
                  </p>
                </Card>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  Fecha de inicio <span aria-hidden="true">*</span>
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">
                  Titulo <span aria-hidden="true">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Ejemplo: Esguince de tobillo"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Descripcion</label>
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Descripcion breve de la lesion"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase text-muted-foreground">Zona corporal</label>
                <Input
                  value={form.bodyArea}
                  onChange={(event) => setForm((prev) => ({ ...prev, bodyArea: event.target.value }))}
                  placeholder="Ejemplo: Tobillo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase text-muted-foreground">Lado</label>
                <Select
                  value={form.bodySide}
                  onValueChange={(value: unknown) =>
                    setForm((prev) => ({ ...prev, bodySide: (value as BodySide) ?? 'NOT_APPLICABLE' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: string | null) => bodySideLabel((value as BodySide) || 'NOT_APPLICABLE')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_SIDE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {bodySideLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase text-muted-foreground">Severidad</label>
                <Select
                  value={form.severity}
                  onValueChange={(value: unknown) =>
                    setForm((prev) => ({ ...prev, severity: (value as InjurySeverity) ?? 'MODERATE' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: string | null) => severityLabel((value as InjurySeverity) || 'MODERATE')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {severityLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase text-muted-foreground">Es recaida</label>
                <Select
                  value={form.relapseOfId || 'NONE'}
                  onValueChange={(value: unknown) =>
                    setForm((prev) => ({
                      ...prev,
                      relapseOfId:
                        (value as string | null) && (value as string) !== 'NONE'
                          ? (value as string)
                          : '',
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => {
                        if (!value || value === 'NONE') {
                          return 'No';
                        }

                        return (
                          closedInjuries.find((injury) => injury.id === value)?.title ||
                          'Lesion previa seleccionada'
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No</SelectItem>
                    {closedInjuries.map((injury) => (
                      <SelectItem key={injury.id} value={injury.id}>
                        {injury.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium uppercase text-muted-foreground">Notas internas del staff</label>
                <Textarea
                  value={form.staffNotes}
                  onChange={(event) => setForm((prev) => ({ ...prev, staffNotes: event.target.value }))}
                  placeholder="Contexto de entrenamiento, carga y seguimiento"
                />
              </div>
            </div>
          </Card>

          {doctorMode ? (
            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Evaluacion medica</h2>
                <Badge variant="outline">Solo medico</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Estado inicial</label>
                  <Input value="ACTIVA" disabled />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Fecha estimada de regreso</label>
                  <Input
                    type="date"
                    value={form.estimatedReturnDate}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, estimatedReturnDate: event.target.value }))
                    }
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.canTrain)}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, canTrain: event.target.checked }))
                    }
                    className="size-4 accent-primary"
                  />
                  Puede entrenar
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.canPlay)}
                    onChange={(event) => setForm((prev) => ({ ...prev, canPlay: event.target.checked }))}
                    className="size-4 accent-primary"
                  />
                  Puede jugar
                </label>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Indicaciones para el jugador</label>
                  <Textarea
                    value={form.playerNotes}
                    onChange={(event) => setForm((prev) => ({ ...prev, playerNotes: event.target.value }))}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Recomendaciones deportivas</label>
                  <Textarea
                    value={form.sportsRecommendations}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, sportsRecommendations: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Diagnostico</label>
                  <Textarea
                    value={form.diagnosis}
                    onChange={(event) => setForm((prev) => ({ ...prev, diagnosis: event.target.value }))}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Notas clinicas</label>
                  <Textarea
                    value={form.clinicalNotes}
                    onChange={(event) => setForm((prev) => ({ ...prev, clinicalNotes: event.target.value }))}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Plan de tratamiento</label>
                  <Textarea
                    value={form.treatmentPlan}
                    onChange={(event) => setForm((prev) => ({ ...prev, treatmentPlan: event.target.value }))}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Plan de rehabilitacion</label>
                  <Textarea
                    value={form.rehabilitationPlan}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, rehabilitationPlan: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Recomendaciones medicas</label>
                  <Textarea
                    value={form.medicalRecommendations}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, medicalRecommendations: event.target.value }))
                    }
                  />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border border-amber-500/30 bg-amber-500/5 p-5">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                La disponibilidad medica sera definida posteriormente por un medico del club.
                Hasta entonces el jugador quedara marcado como no disponible.
              </p>
            </Card>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || loadingPlayer}>
              Registrar lesion
            </Button>
          </div>
        </form>
      </main>

      <AlertDialog
        open={showConfirmDialog}
        title="Confirmar registro de lesion"
        description="Revisa los datos antes de registrar la lesion."
        cancelText="Cancelar"
        confirmText="Confirmar y registrar"
        confirmingText="Registrando..."
        confirming={saving}
        onCancel={() => {
          setDialogError(null);
          setShowConfirmDialog(false);
        }}
        onConfirm={handleConfirmCreate}
      >
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Jugador</p>
            <p className="text-sm font-semibold">{player?.nombreCompleto || 'Jugador sin nombre'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Fecha de inicio</p>
            <p className="text-sm font-semibold">
              {form.startDate ? formatDateOnly(form.startDate) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Lesion</p>
            <p className="text-sm font-semibold">{form.title.trim() || '-'}</p>
          </div>

          {(form.bodyArea || form.bodySide || form.severity) && (
            <div className="space-y-2 border-t pt-3">
              {form.bodyArea && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Zona corporal</p>
                  <p className="text-sm">{form.bodyArea}</p>
                </div>
              )}
              {form.bodySide && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Lado</p>
                  <p className="text-sm">{bodySideLabel(form.bodySide)}</p>
                </div>
              )}
              {form.severity && (
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Severidad</p>
                  <p className="text-sm">{severityLabel(form.severity)}</p>
                </div>
              )}
            </div>
          )}

          {dialogError && (
            <div className="space-y-1 border-t border-destructive/30 pt-3">
              <p className="text-sm font-semibold text-destructive">No se pudo registrar la lesion.</p>
              <p className="text-sm text-destructive/90">{dialogError}</p>
            </div>
          )}
        </div>
      </AlertDialog>
    </div>
  );
}
