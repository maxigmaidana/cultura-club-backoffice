import type { CreateLinkAttachmentInput, PlayerUnavailabilityAttachment } from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class CreateLinkAttachmentUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: CreateLinkAttachmentInput): Promise<PlayerUnavailabilityAttachment> {
    return this.availabilityRepository.createLinkAttachment(input);
  }
}
