import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class CloseInjuryUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(injuryId: string): Promise<void> {
    return this.availabilityRepository.closeInjury(injuryId);
  }
}
