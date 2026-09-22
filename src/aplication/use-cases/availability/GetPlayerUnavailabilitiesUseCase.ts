import type { PlayerUnavailability } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetPlayerUnavailabilitiesUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(playerId: string): Promise<PlayerUnavailability[]> {
    return this.availabilityRepository.getPlayerUnavailabilities(playerId);
  }
}
