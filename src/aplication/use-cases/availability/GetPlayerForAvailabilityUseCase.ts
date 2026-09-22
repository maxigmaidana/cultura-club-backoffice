import type {
  PlayerAvailabilityContext,
  PlayerForAvailabilityFilters,
} from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetPlayerForAvailabilityUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(filters: PlayerForAvailabilityFilters): Promise<PlayerAvailabilityContext | null> {
    return this.availabilityRepository.getPlayerForAvailability(filters);
  }
}
