import type { ITriviaRepository } from "@/domain/repositories/trivia/trivia_repository";
import type { Trivia } from "@/domain/entities/trivia/Trivia";

export class CreateTriviaUseCase {
  private triviaRepository: ITriviaRepository;

  constructor(triviaRepository: ITriviaRepository) {
    this.triviaRepository = triviaRepository;
  }

  async execute(trivia: Trivia): Promise<void> {
    if (!trivia.pregunta.trim()) {
      throw new Error('La pregunta no puede estar vacía.');
    }
    if (trivia.opciones.length < 2) {
      throw new Error('Debe haber al menos 2 opciones.');
    }
    
    await this.triviaRepository.createTrivia(trivia);
  }
}