import type { CreateInjuryInput } from '@/domain/entities/availability/Availability';
import type { Role } from '@/domain/entities/auth/UserProfile';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class CreateInjuryUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(input: CreateInjuryInput, role: Role): Promise<string> {
    return this.availabilityRepository.createInjury(input, role);
  }
}
