import type { PlayerUnavailabilityMedicalDetails } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetMedicalDetailsUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(unavailabilityId: string): Promise<PlayerUnavailabilityMedicalDetails | null> {
    return this.availabilityRepository.getMedicalDetails(unavailabilityId);
  }
}
