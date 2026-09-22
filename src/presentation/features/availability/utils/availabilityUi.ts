import type {
  BodySide,
  HistoryEventType,
  InjurySeverity,
  JsonValue,
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

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecordValue(record: { [key: string]: JsonValue }, keys: string[]): JsonValue | null {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return null;
}

function toBooleanLabel(value: JsonValue | null): string | null {
  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  return null;
}

function toDateLabel(value: JsonValue | null): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-AR');
}

function toStatusLabel(value: JsonValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (value === 'ACTIVE' || value === 'RECOVERING' || value === 'CLOSED') {
    return statusLabel(value);
  }

  return value;
}

function extractChange(record: { [key: string]: JsonValue }, field: string): [JsonValue | null, JsonValue | null] {
  const from = getRecordValue(record, [
    `${field}_from`,
    `${field}_old`,
    `old_${field}`,
    `prev_${field}`,
    `${field}Before`,
  ]);
  const to = getRecordValue(record, [
    `${field}_to`,
    `${field}_new`,
    `new_${field}`,
    `next_${field}`,
    `${field}After`,
    field,
  ]);

  return [from, to];
}

export function formatHistoryDetails(eventType: HistoryEventType, details: JsonValue): string[] {
  if (details === null) {
    return [];
  }

  if (typeof details === 'string') {
    return details.trim().length > 0 ? [details] : [];
  }

  if (!isRecord(details)) {
    return [];
  }

  if (eventType === 'CREATED') {
    const lines: string[] = ['Lesion registrada.'];
    const initialStatus = toStatusLabel(getRecordValue(details, ['status']));
    const canTrain = toBooleanLabel(getRecordValue(details, ['can_train', 'canTrain']));
    const canPlay = toBooleanLabel(getRecordValue(details, ['can_play', 'canPlay']));
    const estimatedReturn = toDateLabel(
      getRecordValue(details, ['estimated_return_date', 'estimatedReturnDate'])
    );

    if (initialStatus) {
      lines.push(`Estado inicial: ${initialStatus}.`);
    }
    if (canTrain) {
      lines.push(`Puede entrenar: ${canTrain}.`);
    }
    if (canPlay) {
      lines.push(`Puede jugar: ${canPlay}.`);
    }
    if (estimatedReturn) {
      lines.push(`Regreso estimado: ${estimatedReturn}.`);
    }

    return lines;
  }

  if (eventType === 'RESTRICTIONS_CHANGED') {
    const lines: string[] = ['Disponibilidad actualizada.'];
    const [trainFrom, trainTo] = extractChange(details, 'can_train');
    const [playFrom, playTo] = extractChange(details, 'can_play');
    const trainFromLabel = toBooleanLabel(trainFrom);
    const trainToLabel = toBooleanLabel(trainTo);
    const playFromLabel = toBooleanLabel(playFrom);
    const playToLabel = toBooleanLabel(playTo);

    if (trainFromLabel || trainToLabel) {
      lines.push(`Entrenamiento: ${trainFromLabel ?? '-'} -> ${trainToLabel ?? '-'}`);
    }
    if (playFromLabel || playToLabel) {
      lines.push(`Partidos: ${playFromLabel ?? '-'} -> ${playToLabel ?? '-'}`);
    }

    return lines;
  }

  if (eventType === 'STATUS_CHANGED') {
    const [statusFrom, statusTo] = extractChange(details, 'status');
    const fromLabel = toStatusLabel(statusFrom);
    const toLabel = toStatusLabel(statusTo);

    if (fromLabel || toLabel) {
      return [`Estado: ${fromLabel ?? '-'} -> ${toLabel ?? '-'}`];
    }

    return ['Estado actualizado.'];
  }

  if (eventType === 'ESTIMATED_RETURN_CHANGED') {
    const [returnFrom, returnTo] = extractChange(details, 'estimated_return_date');
    const fromLabel = toDateLabel(returnFrom);
    const toLabel = toDateLabel(returnTo);

    if (fromLabel || toLabel) {
      return [`Fecha estimada de regreso: ${fromLabel ?? '-'} -> ${toLabel ?? '-'}`];
    }

    return ['Fecha estimada de regreso actualizada.'];
  }

  if (eventType === 'SPORTS_RECOMMENDATIONS_CHANGED') {
    return ['Recomendaciones deportivas actualizadas.'];
  }

  if (eventType === 'MEDICAL_CLEARANCE') {
    return ['Alta medica otorgada.'];
  }

  if (eventType === 'DETAILS_UPDATED') {
    return ['Informacion general actualizada.'];
  }

  return [];
}
