import type { UpdateStaffNotesInput } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class UpdateStaffNotesUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: UpdateStaffNotesInput): Promise<void> {
    return this.availabilityRepository.updateStaffNotes(input);
  }
}
