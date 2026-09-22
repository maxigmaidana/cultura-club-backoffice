import type { PlayerUnavailabilityStaffDetails } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetStaffDetailsUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(unavailabilityId: string): Promise<PlayerUnavailabilityStaffDetails | null> {
    return this.availabilityRepository.getStaffDetails(unavailabilityId);
  }
}
