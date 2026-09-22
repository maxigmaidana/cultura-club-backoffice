import type { UpdateMedicalAssessmentInput } from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class UpdateMedicalAssessmentUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: UpdateMedicalAssessmentInput): Promise<void> {
    return this.availabilityRepository.updateMedicalAssessment(input);
  }
}
