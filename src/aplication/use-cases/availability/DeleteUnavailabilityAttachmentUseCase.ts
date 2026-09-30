import type { DeleteAttachmentInput } from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class DeleteUnavailabilityAttachmentUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: DeleteAttachmentInput): Promise<void> {
    return this.availabilityRepository.deleteAttachment(input);
  }
}
