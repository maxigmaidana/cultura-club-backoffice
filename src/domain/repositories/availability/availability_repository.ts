import type {
  AvailabilityCategory,
  CategoriesForAvailabilityFilters,
  CreateInjuryInput,
  PlayerAvailability,
  PlayerAvailabilityContext,
  PlayerForAvailabilityFilters,
  PlayerForAvailability,
  PlayerUnavailability,
  PlayerUnavailabilityHistoryEvent,
  PlayerUnavailabilityMedicalDetails,
  PlayerUnavailabilityStaffDetails,
  PlayersForAvailabilityFilters,
  UpdateGeneralInjuryInput,
  UpdateMedicalAssessmentInput,
  UpdateMedicalDetailsInput,
  UpdateStaffNotesInput,
} from '@/domain/entities/availability/Availability';
import type { Role } from '@/domain/entities/auth/UserProfile';

export interface IAvailabilityRepository {
  getCategoriesForAvailability(filters: CategoriesForAvailabilityFilters): Promise<AvailabilityCategory[]>;
  getPlayerForAvailability(filters: PlayerForAvailabilityFilters): Promise<PlayerAvailabilityContext | null>;
  getPlayersForAvailability(filters: PlayersForAvailabilityFilters): Promise<PlayerForAvailability[]>;
  getPlayerAvailability(playerId: string): Promise<PlayerAvailability>;
  getPlayerUnavailabilities(playerId: string): Promise<PlayerUnavailability[]>;
  getUnavailabilityById(injuryId: string): Promise<PlayerUnavailability>;
  getStaffDetails(unavailabilityId: string): Promise<PlayerUnavailabilityStaffDetails | null>;
  getMedicalDetails(unavailabilityId: string): Promise<PlayerUnavailabilityMedicalDetails | null>;
  getHistory(unavailabilityId: string): Promise<PlayerUnavailabilityHistoryEvent[]>;
  createInjury(input: CreateInjuryInput, role: Role): Promise<string>;
  updateGeneralInjury(input: UpdateGeneralInjuryInput): Promise<void>;
  updateStaffNotes(input: UpdateStaffNotesInput): Promise<void>;
  updateMedicalAssessment(input: UpdateMedicalAssessmentInput): Promise<void>;
  updateMedicalDetails(input: UpdateMedicalDetailsInput): Promise<void>;
  closeInjury(injuryId: string): Promise<void>;
}
