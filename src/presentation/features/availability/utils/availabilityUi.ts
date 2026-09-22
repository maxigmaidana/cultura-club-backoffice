import type {
  BodySide,
  HistoryEventType,
  InjurySeverity,
  PlayerAvailability,
  UnavailabilityStatus,
} from '@/domain/entities/availability/Availability';

export type AvailabilityState = 'AVAILABLE' | 'FOLLOW_UP' | 'TRAINING_RESTRICTION' | 'NOT_AVAILABLE';

export function getAvailabilityState(availability: PlayerAvailability): AvailabilityState {
  if (!availability.canPlay) {
    return 'NOT_AVAILABLE';
  }

  if (availability.canPlay && !availability.canTrain) {
    return 'TRAINING_RESTRICTION';
  }

  if (availability.activeInjuriesCount > 0) {
    return 'FOLLOW_UP';
  }

  return 'AVAILABLE';
}

export function availabilityStateLabel(state: AvailabilityState): string {
  const labels: Record<AvailabilityState, string> = {
    AVAILABLE: 'Disponible',
    FOLLOW_UP: 'Con seguimiento',
    TRAINING_RESTRICTION: 'Restriccion de entrenamiento',
    NOT_AVAILABLE: 'No disponible',
  };

  return labels[state];
}

export function availabilityStateVariant(
  state: AvailabilityState
): 'success' | 'warning' | 'danger' {
  if (state === 'AVAILABLE') {
    return 'success';
  }

  if (state === 'NOT_AVAILABLE') {
    return 'danger';
  }

  return 'warning';
}

export function statusLabel(status: UnavailabilityStatus): string {
  const labels: Record<UnavailabilityStatus, string> = {
    ACTIVE: 'Activa',
    RECOVERING: 'En recuperacion',
    CLOSED: 'Alta medica',
  };

  return labels[status];
}

export function severityLabel(severity: InjurySeverity): string {
  const labels: Record<InjurySeverity, string> = {
    MILD: 'Leve',
    MODERATE: 'Moderada',
    SEVERE: 'Grave',
  };

  return labels[severity];
}

export function bodySideLabel(side: BodySide): string {
  const labels: Record<BodySide, string> = {
    LEFT: 'Izquierda',
    RIGHT: 'Derecha',
    BILATERAL: 'Bilateral',
    NOT_APPLICABLE: 'No aplica',
  };

  return labels[side];
}

export function historyEventLabel(eventType: HistoryEventType): string {
  const labels: Record<HistoryEventType, string> = {
    CREATED: 'Lesion registrada',
    DETAILS_UPDATED: 'Informacion general actualizada',
    STATUS_CHANGED: 'Estado actualizado',
    RESTRICTIONS_CHANGED: 'Disponibilidad modificada',
    ESTIMATED_RETURN_CHANGED: 'Fecha estimada actualizada',
    SPORTS_RECOMMENDATIONS_CHANGED: 'Recomendaciones deportivas actualizadas',
    MEDICAL_CLEARANCE: 'Alta medica otorgada',
  };

  return labels[eventType];
}
