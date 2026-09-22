import type {
  AvailabilityCategory,
  CategoriesForAvailabilityFilters,
} from '@/domain/entities/availability/Availability';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

export class GetCategoriesForAvailabilityUseCase {
  private availabilityRepository: IAvailabilityRepository;

  constructor(availabilityRepository: IAvailabilityRepository) {
    this.availabilityRepository = availabilityRepository;
  }

  async execute(filters: CategoriesForAvailabilityFilters): Promise<AvailabilityCategory[]> {
    return this.availabilityRepository.getCategoriesForAvailability(filters);
  }
}
