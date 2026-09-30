import type { PlayerUnavailabilityAttachment, UploadFileAttachmentInput } from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class UploadFileAttachmentUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: UploadFileAttachmentInput): Promise<PlayerUnavailabilityAttachment> {
    return this.availabilityRepository.uploadFileAttachment(input);
  }
}
