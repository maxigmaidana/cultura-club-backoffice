import type { PlayerAvailability } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetPlayerAvailabilityUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(playerId: string): Promise<PlayerAvailability> {
    return this.availabilityRepository.getPlayerAvailability(playerId);
  }
}
