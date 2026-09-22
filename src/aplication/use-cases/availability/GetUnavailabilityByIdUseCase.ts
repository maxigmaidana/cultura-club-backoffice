import type { PlayerUnavailability } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetUnavailabilityByIdUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(injuryId: string): Promise<PlayerUnavailability> {
    return this.availabilityRepository.getUnavailabilityById(injuryId);
  }
}
