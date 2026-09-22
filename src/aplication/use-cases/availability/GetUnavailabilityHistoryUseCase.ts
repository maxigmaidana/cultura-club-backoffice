import type { PlayerUnavailabilityHistoryEvent } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetUnavailabilityHistoryUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(unavailabilityId: string): Promise<PlayerUnavailabilityHistoryEvent[]> {
    return this.availabilityRepository.getHistory(unavailabilityId);
  }
}
