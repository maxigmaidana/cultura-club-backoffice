import type { PlayerForAvailability, PlayersForAvailabilityFilters } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetPlayersForAvailabilityUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(filters: PlayersForAvailabilityFilters): Promise<PlayerForAvailability[]> {
    return this.availabilityRepository.getPlayersForAvailability(filters);
  }
}
