import type { ITriviaRepository, TriviaWithCategoria } from '@/domain/repositories/trivia/trivia_repository';

export class GetAllTriviasUseCase {
  private triviaRepository: ITriviaRepository;

  constructor(triviaRepository: ITriviaRepository) {
    this.triviaRepository = triviaRepository;
  }

  async execute(): Promise<TriviaWithCategoria[]> {
    return await this.triviaRepository.getAllTrivias();
  }
}
