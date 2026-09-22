import type { Role } from '@/domain/entities/auth/UserProfile';

export type UnavailabilityStatus = 'ACTIVE' | 'RECOVERING' | 'CLOSED';
export type UnavailabilityType = 'INJURY';
export type BodySide = 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NOT_APPLICABLE';
export type InjurySeverity = 'MILD' | 'MODERATE' | 'SEVERE';

export type HistoryEventType =
  | 'CREATED'
  | 'DETAILS_UPDATED'
  | 'STATUS_CHANGED'
  | 'RESTRICTIONS_CHANGED'
  | 'ESTIMATED_RETURN_CHANGED'
  | 'SPORTS_RECOMMENDATIONS_CHANGED'
  | 'MEDICAL_CLEARANCE';

export type HistoryVisibility = 'PLAYER' | 'STAFF' | 'MEDICAL' | 'SYSTEM';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface PlayerAvailability {
  playerId: string;
  canTrain: boolean;
  canPlay: boolean;
  activeInjuriesCount: number;
}

export interface PlayerForAvailability {
  userId: string;
  nombreCompleto: string;
  categoriaId: string | null;
  categoriaNombre: string;
  sectorCancha: string | null;
  posiciones: string[];
  fotoUrl: string | null;
  availability: PlayerAvailability;
}

export interface PlayerAvailabilityContext {
  userId: string;
  nombreCompleto: string;
  categoriaId: string | null;
  categoriaNombre: string;
  sectorCancha: string | null;
  posiciones: string[];
  fotoUrl: string | null;
}

export interface AvailabilityCategory {
  id: string;
  nombre: string;
  clubId?: string | null;
  entrenadorId?: string | null;
}

export interface PlayerUnavailability {
  id: string;
  clubId: string;
  playerId: string;
  categoryId: string | null;
  type: UnavailabilityType;
  status: UnavailabilityStatus;
  title: string;
  description: string | null;
  bodyArea: string | null;
  bodySide: BodySide;
  severity: InjurySeverity;
  startDate: string;
  estimatedReturnDate: string | null;
  canTrain: boolean;
  canPlay: boolean;
  requiresMedicalClearance: boolean;
  playerNotes: string | null;
  createdBy: string;
  updatedBy: string | null;
  closedBy: string | null;
  closedAt: string | null;
  relapseOfId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerUnavailabilityStaffDetails {
  unavailabilityId: string;
  staffNotes: string | null;
  sportsRecommendations: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerUnavailabilityMedicalDetails {
  unavailabilityId: string;
  diagnosis: string | null;
  clinicalNotes: string | null;
  treatmentPlan: string | null;
  rehabilitationPlan: string | null;
  medicalRecommendations: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerUnavailabilityHistoryEvent {
  id: string;
  unavailabilityId: string;
  eventType: HistoryEventType;
  visibility: HistoryVisibility;
  details: JsonValue;
  notes: string | null;
  changedBy: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface PlayersForAvailabilityFilters {
  role: Role;
  requesterId: string;
  clubId?: string | null;
  search?: string;
  categoryId?: string;
}

export interface CategoriesForAvailabilityFilters {
  role: Role;
  requesterId: string;
  clubId?: string | null;
}

export interface PlayerForAvailabilityFilters {
  role: Role;
  requesterId: string;
  clubId?: string | null;
  playerId: string;
}

export interface CreateInjuryInput {
  playerId: string;
  title: string;
  startDate: string;
  description?: string;
  bodyArea?: string;
  bodySide?: BodySide;
  severity?: InjurySeverity;
  staffNotes?: string;
  playerNotes?: string;
  sportsRecommendations?: string;
  estimatedReturnDate?: string;
  canTrain?: boolean;
  canPlay?: boolean;
  relapseOfId?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  rehabilitationPlan?: string;
  medicalRecommendations?: string;
}

export interface UpdateGeneralInjuryInput {
  injuryId: string;
  title: string;
  description: string;
  bodyArea: string;
  bodySide: BodySide;
  severity: InjurySeverity;
  startDate: string;
  relapseOfId?: string | null;
}

export interface UpdateStaffNotesInput {
  injuryId: string;
  staffNotes: string;
  sportsRecommendations?: string;
}

export interface UpdateMedicalAssessmentInput {
  injuryId: string;
  status: Extract<UnavailabilityStatus, 'ACTIVE' | 'RECOVERING'>;
  canTrain: boolean;
  canPlay: boolean;
  estimatedReturnDate?: string | null;
  playerNotes?: string;
}

export interface UpdateMedicalDetailsInput {
  injuryId: string;
  diagnosis: string;
  clinicalNotes: string;
  treatmentPlan: string;
  rehabilitationPlan: string;
  medicalRecommendations: string;
}
