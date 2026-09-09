import type { ITriviaRepository } from '@/domain/repositories/trivia/trivia_repository';

export class DeleteTriviaUseCase {
  private triviaRepository: ITriviaRepository;

  constructor(triviaRepository: ITriviaRepository) {
    this.triviaRepository = triviaRepository;
  }

  async execute(triviaId: string): Promise<void> {
    if (!triviaId.trim()) {
      throw new Error('El ID de la trivia no puede estar vacío.');
    }

    await this.triviaRepository.deleteTrivia(triviaId);
  }
}
