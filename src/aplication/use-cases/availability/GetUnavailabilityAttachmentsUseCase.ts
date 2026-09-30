import type { PlayerUnavailabilityAttachment } from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetUnavailabilityAttachmentsUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(unavailabilityId: string): Promise<PlayerUnavailabilityAttachment[]> {
    return this.availabilityRepository.getUnavailabilityAttachments(unavailabilityId);
  }
}
