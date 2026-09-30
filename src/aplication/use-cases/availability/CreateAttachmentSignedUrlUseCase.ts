import type { CreateAttachmentSignedUrlInput } from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class CreateAttachmentSignedUrlUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: CreateAttachmentSignedUrlInput): Promise<string> {
    return this.availabilityRepository.createAttachmentSignedUrl(input);
  }
}
