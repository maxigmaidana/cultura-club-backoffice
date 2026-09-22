import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type {
  BodySide,
  InjurySeverity,
  PlayerForAvailability,
  PlayerUnavailability,
  PlayerUnavailabilityHistoryEvent,
} from '@/domain/entities/availability/Availability';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import {
  closeInjuryUseCase,
  getMedicalDetailsUseCase,
  getPlayersForAvailabilityUseCase,
  getStaffDetailsUseCase,
  getUnavailabilityByIdUseCase,
  getUnavailabilityHistoryUseCase,
  updateGeneralInjuryUseCase,
  updateMedicalAssessmentUseCase,
  updateMedicalDetailsUseCase,
  updateStaffNotesUseCase,
} from '@/presentation/features/availability/services/availabilityDependencies';
import {
  bodySideLabel,
  historyEventLabel,
  severityLabel,
  statusLabel,
} from '@/presentation/features/availability/utils/availabilityUi';

const ALLOWED_ROLES = ['ENTRENADOR', 'ADMIN_CLUB', 'SUPER_ADMIN', 'DOCTOR'] as const;

function isAllowedRole(role: string): boolean {
  return ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);
}

const BODY_SIDE_OPTIONS: BodySide[] = ['LEFT', 'RIGHT', 'BILATERAL', 'NOT_APPLICABLE'];
const SEVERITY_OPTIONS: InjurySeverity[] = ['MILD', 'MODERATE', 'SEVERE'];

export function InjuryDetailPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { injuryId } = useParams<{ injuryId: string }>();

  const [injury, setInjury] = useState<PlayerUnavailability | null>(null);
  const [player, setPlayer] = useState<PlayerForAvailability | null>(null);
  const [history, setHistory] = useState<PlayerUnavailabilityHistoryEvent[]>([]);

  const [generalForm, setGeneralForm] = useState({
    title: '',
    description: '',
    bodyArea: '',
    bodySide: 'NOT_APPLICABLE' as BodySide,
    severity: 'MODERATE' as InjurySeverity,
    startDate: '',
    relapseOfId: '',
  });

  const [assessmentForm, setAssessmentForm] = useState({
    status: 'ACTIVE' as 'ACTIVE' | 'RECOVERING',
    canTrain: false,
    canPlay: false,
    estimatedReturnDate: '',
    playerNotes: '',
  });

  const [staffForm, setStaffForm] = useState({
    staffNotes: '',
    sportsRecommendations: '',
  });

  const [medicalForm, setMedicalForm] = useState({
    diagnosis: '',
    clinicalNotes: '',
    treatmentPlan: '',
    rehabilitationPlan: '',
    medicalRecommendations: '',
  });

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const isDoctor = profile?.role === 'DOCTOR';
  const isClosed = injury?.status === 'CLOSED';

  const canEditGeneral = Boolean(profile && isAllowedRole(profile.role) && !isClosed);
  const canEditStaff = Boolean(profile && isAllowedRole(profile.role) && !isClosed);
  const canEditSportsRecommendations = Boolean(isDoctor && !isClosed);
  const canEditMedicalAssessment = Boolean(isDoctor && !isClosed);
  const canEditMedicalDetails = Boolean(isDoctor && !isClosed);
  const canCloseInjury = Boolean(isDoctor && injury && injury.status !== 'CLOSED');

  const fetchData = useCallback(async () => {
    if (!profile || !injuryId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [injuryData, staffData, historyData, players] = await Promise.all([
        getUnavailabilityByIdUseCase.execute(injuryId),
        getStaffDetailsUseCase.execute(injuryId),
        getUnavailabilityHistoryUseCase.execute(injuryId),
        getPlayersForAvailabilityUseCase.execute({
          role: profile.role,
          requesterId: profile.id,
          clubId: profile.club_id,
        }),
      ]);

      setInjury(injuryData);
      setHistory(historyData);
      setPlayer(players.find((candidate) => candidate.userId === injuryData.playerId) ?? null);

      setGeneralForm({
        title: injuryData.title,
        description: injuryData.description ?? '',
        bodyArea: injuryData.bodyArea ?? '',
        bodySide: injuryData.bodySide,
        severity: injuryData.severity,
        startDate: injuryData.startDate,
        relapseOfId: injuryData.relapseOfId ?? '',
      });

      setAssessmentForm({
        status: injuryData.status === 'RECOVERING' ? 'RECOVERING' : 'ACTIVE',
        canTrain: injuryData.canTrain,
        canPlay: injuryData.canPlay,
        estimatedReturnDate: injuryData.estimatedReturnDate ?? '',
        playerNotes: injuryData.playerNotes ?? '',
      });

      setStaffForm({
        staffNotes: staffData?.staffNotes ?? '',
        sportsRecommendations: staffData?.sportsRecommendations ?? '',
      });

      if (isDoctor) {
        const medicalData = await getMedicalDetailsUseCase.execute(injuryId);
        setMedicalForm({
          diagnosis: medicalData?.diagnosis ?? '',
          clinicalNotes: medicalData?.clinicalNotes ?? '',
          treatmentPlan: medicalData?.treatmentPlan ?? '',
          rehabilitationPlan: medicalData?.rehabilitationPlan ?? '',
          medicalRecommendations: medicalData?.medicalRecommendations ?? '',
        });
      }
    } catch (err) {
      console.error('Error al cargar detalle de lesion:', err);
      const message = err instanceof Error ? err.message : 'No se pudo cargar el detalle de la lesion.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [injuryId, isDoctor, profile]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const handleSaveGeneral = async (event: FormEvent) => {
    event.preventDefault();

    if (!injury || injury.status === 'CLOSED') {
      return;
    }

    try {
      setSavingSection('general');
      setError(null);
      setSuccessMessage(null);

      await updateGeneralInjuryUseCase.execute({
        injuryId: injury.id,
        title: generalForm.title,
        description: generalForm.description,
        bodyArea: generalForm.bodyArea,
        bodySide: generalForm.bodySide,
        severity: generalForm.severity,
        startDate: generalForm.startDate,
        relapseOfId: generalForm.relapseOfId || null,
      });

      setSuccessMessage('Informacion general actualizada correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al actualizar informacion general:', err);
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la informacion general.';
      setError(message);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveAssessment = async (event: FormEvent) => {
    event.preventDefault();

    if (!injury || injury.status === 'CLOSED' || !isDoctor) {
      return;
    }

    try {
      setSavingSection('assessment');
      setError(null);
      setSuccessMessage(null);

      await updateMedicalAssessmentUseCase.execute({
        injuryId: injury.id,
        status: assessmentForm.status,
        canTrain: assessmentForm.canTrain,
        canPlay: assessmentForm.canPlay,
        estimatedReturnDate: assessmentForm.estimatedReturnDate || null,
        playerNotes: assessmentForm.playerNotes,
      });

      setSuccessMessage('Disponibilidad medica actualizada correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al actualizar disponibilidad medica:', err);
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la disponibilidad medica.';
      setError(message);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveStaff = async (event: FormEvent) => {
    event.preventDefault();

    if (!injury || injury.status === 'CLOSED') {
      return;
    }

    try {
      setSavingSection('staff');
      setError(null);
      setSuccessMessage(null);

      await updateStaffNotesUseCase.execute({
        injuryId: injury.id,
        staffNotes: staffForm.staffNotes,
        sportsRecommendations: canEditSportsRecommendations
          ? staffForm.sportsRecommendations
          : undefined,
      });

      setSuccessMessage('Informacion del cuerpo tecnico actualizada correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al actualizar datos del cuerpo tecnico:', err);
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la informacion del cuerpo tecnico.';
      setError(message);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveMedicalDetails = async (event: FormEvent) => {
    event.preventDefault();

    if (!injury || injury.status === 'CLOSED' || !isDoctor) {
      return;
    }

    try {
      setSavingSection('medical-details');
      setError(null);
      setSuccessMessage(null);

      await updateMedicalDetailsUseCase.execute({
        injuryId: injury.id,
        diagnosis: medicalForm.diagnosis,
        clinicalNotes: medicalForm.clinicalNotes,
        treatmentPlan: medicalForm.treatmentPlan,
        rehabilitationPlan: medicalForm.rehabilitationPlan,
        medicalRecommendations: medicalForm.medicalRecommendations,
      });

      setSuccessMessage('Informacion clinica actualizada correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al actualizar informacion clinica:', err);
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la informacion clinica.';
      setError(message);
    } finally {
      setSavingSection(null);
    }
  };

  const handleCloseInjury = async () => {
    if (!injury || !isDoctor) {
      return;
    }

    try {
      setSavingSection('close');
      setError(null);
      setSuccessMessage(null);

      await closeInjuryUseCase.execute(injury.id);
      setShowCloseDialog(false);
      setSuccessMessage('Alta medica otorgada correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Error al otorgar alta medica:', err);
      const message = err instanceof Error ? err.message : 'No se pudo otorgar el alta medica.';
      setError(message);
    } finally {
      setSavingSection(null);
    }
  };

  const statusBadgeVariant = useMemo(() => {
    if (!injury) {
      return 'outline' as const;
    }

    if (injury.status === 'CLOSED') {
      return 'success' as const;
    }

    if (injury.status === 'RECOVERING') {
      return 'warning' as const;
    }

    return 'danger' as const;
  }, [injury]);

  if (profile && !isAllowedRole(profile.role)) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="border-b px-4 py-4 sm:px-6">
        <button
          onClick={() =>
            navigate(injury ? `/availability/players/${injury.playerId}` : '/availability')
          }
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
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

        {successMessage && (
          <Card className="border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
            {successMessage}
          </Card>
        )}

        {loading ? (
          <Card className="space-y-3 p-5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-44" />
          </Card>
        ) : injury ? (
          <>
            <Card className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold">{injury.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {player?.nombreCompleto || 'Jugador'} · {player?.categoriaNombre || 'Categoria'}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant}>{statusLabel(injury.status)}</Badge>
              </div>

              {injury.status === 'CLOSED' && (
                <Card className="border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-semibold">Alta medica otorgada</p>
                  <p>
                    Fecha:{' '}
                    {injury.closedAt
                      ? new Date(injury.closedAt).toLocaleString('es-AR')
                      : 'No disponible'}
                  </p>
                  <p>Profesional: {injury.closedBy || 'No disponible'}</p>
                </Card>
              )}
            </Card>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-4 p-5">
                <h2 className="text-base font-semibold">Informacion general</h2>
                <form className="space-y-3" onSubmit={handleSaveGeneral}>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Titulo</label>
                    <Input
                      value={generalForm.title}
                      onChange={(event) => setGeneralForm((prev) => ({ ...prev, title: event.target.value }))}
                      disabled={!canEditGeneral}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Descripcion</label>
                    <Textarea
                      value={generalForm.description}
                      onChange={(event) =>
                        setGeneralForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      disabled={!canEditGeneral}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Zona corporal</label>
                      <Input
                        value={generalForm.bodyArea}
                        onChange={(event) =>
                          setGeneralForm((prev) => ({ ...prev, bodyArea: event.target.value }))
                        }
                        disabled={!canEditGeneral}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Fecha de inicio</label>
                      <Input
                        type="date"
                        value={generalForm.startDate}
                        onChange={(event) =>
                          setGeneralForm((prev) => ({ ...prev, startDate: event.target.value }))
                        }
                        disabled={!canEditGeneral}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Lado</label>
                      <Select
                        value={generalForm.bodySide}
                        onValueChange={(value: unknown) =>
                          setGeneralForm((prev) => ({
                            ...prev,
                            bodySide: (value as BodySide) ?? 'NOT_APPLICABLE',
                          }))
                        }
                        disabled={!canEditGeneral}
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
                        value={generalForm.severity}
                        onValueChange={(value: unknown) =>
                          setGeneralForm((prev) => ({
                            ...prev,
                            severity: (value as InjurySeverity) ?? 'MODERATE',
                          }))
                        }
                        disabled={!canEditGeneral}
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
                  </div>

                  {canEditGeneral && (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingSection === 'general'}>
                        {savingSection === 'general' ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                    </div>
                  )}
                </form>
              </Card>

              <Card className="space-y-4 p-5">
                <h2 className="text-base font-semibold">Disponibilidad medica</h2>
                <form className="space-y-3" onSubmit={handleSaveAssessment}>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Estado</label>
                    <Select
                      value={assessmentForm.status}
                      onValueChange={(value: unknown) =>
                        setAssessmentForm((prev) => ({
                          ...prev,
                          status: (value as 'ACTIVE' | 'RECOVERING') ?? 'ACTIVE',
                        }))
                      }
                      disabled={!canEditMedicalAssessment}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{(value: string | null) => statusLabel((value as 'ACTIVE' | 'RECOVERING') || 'ACTIVE')}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Activa</SelectItem>
                        <SelectItem value="RECOVERING">En recuperacion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={assessmentForm.canTrain}
                        onChange={(event) =>
                          setAssessmentForm((prev) => ({ ...prev, canTrain: event.target.checked }))
                        }
                        disabled={!canEditMedicalAssessment}
                        className="size-4 accent-primary"
                      />
                      Puede entrenar
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={assessmentForm.canPlay}
                        onChange={(event) =>
                          setAssessmentForm((prev) => ({ ...prev, canPlay: event.target.checked }))
                        }
                        disabled={!canEditMedicalAssessment}
                        className="size-4 accent-primary"
                      />
                      Puede jugar
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Fecha estimada de regreso</label>
                    <Input
                      type="date"
                      value={assessmentForm.estimatedReturnDate}
                      onChange={(event) =>
                        setAssessmentForm((prev) => ({
                          ...prev,
                          estimatedReturnDate: event.target.value,
                        }))
                      }
                      disabled={!canEditMedicalAssessment}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Indicaciones para el jugador</label>
                    <Textarea
                      value={assessmentForm.playerNotes}
                      onChange={(event) =>
                        setAssessmentForm((prev) => ({ ...prev, playerNotes: event.target.value }))
                      }
                      disabled={!canEditMedicalAssessment}
                    />
                  </div>

                  {canEditMedicalAssessment ? (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingSection === 'assessment'}>
                        {savingSection === 'assessment' ? 'Guardando...' : 'Guardar disponibilidad'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Solo un medico puede modificar la disponibilidad.
                    </p>
                  )}
                </form>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-4 p-5">
                <h2 className="text-base font-semibold">Cuerpo tecnico</h2>
                <form className="space-y-3" onSubmit={handleSaveStaff}>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Notas internas del staff</label>
                    <Textarea
                      value={staffForm.staffNotes}
                      onChange={(event) =>
                        setStaffForm((prev) => ({ ...prev, staffNotes: event.target.value }))
                      }
                      disabled={!canEditStaff}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase text-muted-foreground">Recomendaciones deportivas</label>
                    <Textarea
                      value={staffForm.sportsRecommendations}
                      onChange={(event) =>
                        setStaffForm((prev) => ({
                          ...prev,
                          sportsRecommendations: event.target.value,
                        }))
                      }
                      disabled={!canEditSportsRecommendations}
                    />
                    {!isDoctor && (
                      <p className="text-xs text-muted-foreground">
                        Solo un medico puede actualizar recomendaciones deportivas.
                      </p>
                    )}
                  </div>

                  {canEditStaff && (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={savingSection === 'staff'}>
                        {savingSection === 'staff' ? 'Guardando...' : 'Guardar notas'}
                      </Button>
                    </div>
                  )}
                </form>
              </Card>

              {isDoctor && (
                <Card className="space-y-4 p-5">
                  <h2 className="text-base font-semibold">Informacion medica</h2>
                  <form className="space-y-3" onSubmit={handleSaveMedicalDetails}>
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Diagnostico</label>
                      <Textarea
                        value={medicalForm.diagnosis}
                        onChange={(event) =>
                          setMedicalForm((prev) => ({ ...prev, diagnosis: event.target.value }))
                        }
                        disabled={!canEditMedicalDetails}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Notas clinicas</label>
                      <Textarea
                        value={medicalForm.clinicalNotes}
                        onChange={(event) =>
                          setMedicalForm((prev) => ({ ...prev, clinicalNotes: event.target.value }))
                        }
                        disabled={!canEditMedicalDetails}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Plan de tratamiento</label>
                      <Textarea
                        value={medicalForm.treatmentPlan}
                        onChange={(event) =>
                          setMedicalForm((prev) => ({ ...prev, treatmentPlan: event.target.value }))
                        }
                        disabled={!canEditMedicalDetails}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Plan de rehabilitacion</label>
                      <Textarea
                        value={medicalForm.rehabilitationPlan}
                        onChange={(event) =>
                          setMedicalForm((prev) => ({
                            ...prev,
                            rehabilitationPlan: event.target.value,
                          }))
                        }
                        disabled={!canEditMedicalDetails}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase text-muted-foreground">Recomendaciones medicas</label>
                      <Textarea
                        value={medicalForm.medicalRecommendations}
                        onChange={(event) =>
                          setMedicalForm((prev) => ({
                            ...prev,
                            medicalRecommendations: event.target.value,
                          }))
                        }
                        disabled={!canEditMedicalDetails}
                      />
                    </div>

                    {canEditMedicalDetails && (
                      <div className="flex justify-end">
                        <Button type="submit" disabled={savingSection === 'medical-details'}>
                          {savingSection === 'medical-details' ? 'Guardando...' : 'Guardar informacion medica'}
                        </Button>
                      </div>
                    )}
                  </form>
                </Card>
              )}
            </section>

            {canCloseInjury && (
              <Card className="border border-destructive/35 bg-destructive/5 p-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <ShieldCheck className="h-4 w-4" />
                    <h2 className="text-base font-semibold">Alta medica</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Al otorgar el alta, el jugador quedara habilitado para entrenar y jugar. La
                    lesion se cerrara y ya no podra editarse.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowCloseDialog(true)}
                    disabled={savingSection === 'close'}
                  >
                    Dar alta medica
                  </Button>
                </div>
              </Card>
            )}

            <Card className="space-y-4 p-5">
              <h2 className="text-base font-semibold">Historial</h2>

              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay eventos registrados para esta lesion.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <div key={item.id}>
                      <div className="grid gap-1 text-sm sm:grid-cols-[180px_1fr]">
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString('es-AR')}
                        </div>
                        <div>
                          <p className="font-medium">{historyEventLabel(item.eventType)}</p>
                          <p className="text-xs text-muted-foreground">
                            Responsable: {item.changedByName || 'Sistema'}
                          </p>
                          {item.details && (
                            <p className="text-sm text-muted-foreground">{item.details}</p>
                          )}
                          {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                        </div>
                      </div>
                      {index < history.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </main>

      <AlertDialog
        open={showCloseDialog}
        title="Confirmar alta medica"
        description="Al otorgar el alta, el jugador quedara habilitado para entrenar y jugar. La lesion se cerrara y ya no podra editarse."
        cancelText="Cancelar"
        confirmText="Dar alta medica"
        confirming={savingSection === 'close'}
        onCancel={() => setShowCloseDialog(false)}
        onConfirm={handleCloseInjury}
      />
    </div>
  );
}
