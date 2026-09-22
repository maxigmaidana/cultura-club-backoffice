import type { UpdateMedicalDetailsInput } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class UpdateMedicalDetailsUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: UpdateMedicalDetailsInput): Promise<void> {
    return this.availabilityRepository.updateMedicalDetails(input);
  }
}
