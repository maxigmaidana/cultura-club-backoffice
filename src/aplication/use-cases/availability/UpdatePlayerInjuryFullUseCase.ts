import type { UpdatePlayerInjuryFullInput } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class UpdatePlayerInjuryFullUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: UpdatePlayerInjuryFullInput): Promise<void> {
    return this.availabilityRepository.updatePlayerInjuryFull(input);
  }
}
