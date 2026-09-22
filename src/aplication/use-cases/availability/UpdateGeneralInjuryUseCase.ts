import type { UpdateGeneralInjuryInput } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class UpdateGeneralInjuryUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: UpdateGeneralInjuryInput): Promise<void> {
    return this.availabilityRepository.updateGeneralInjury(input);
  }
}
