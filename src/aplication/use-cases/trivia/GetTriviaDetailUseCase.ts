import type { ITriviaRepository, TriviaDetail } from '@/domain/repositories/trivia/trivia_repository';

export class GetTriviaDetailUseCase {
  private triviaRepository: ITriviaRepository;

  constructor(triviaRepository: ITriviaRepository) {
    this.triviaRepository = triviaRepository;
  }

  async execute(triviaId: string): Promise<TriviaDetail> {
    if (!triviaId.trim()) {
      throw new Error('El ID de la trivia no puede estar vacío.');
    }

    return await this.triviaRepository.getTriviaById(triviaId);
  }
}
