import type { ITriviaRepository } from "@/domain/repositories/trivia/trivia_repository";
import type { Trivia } from "@/domain/entities/trivia/Trivia";

export class CreateTriviaUseCase {
  private triviaRepository: ITriviaRepository;

  constructor(triviaRepository: ITriviaRepository) {
    this.triviaRepository = triviaRepository;
  }

  async execute(trivia: Trivia): Promise<void> {
    if (!trivia.titulo.trim()) {
      throw new Error('El título de la trivia no puede estar vacío.');
    }
    if (!trivia.categoria_id) {
      throw new Error('Debe seleccionar una categoría.');
    }
    if (!trivia.creador_id) {
      throw new Error('No se pudo identificar al usuario creador.');
    }
    if (trivia.preguntas.length === 0) {
      throw new Error('Debe agregar al menos una pregunta.');
    }

    trivia.preguntas.forEach((pregunta, index) => {
      if (!pregunta.pregunta.trim()) {
        throw new Error(`La pregunta ${index + 1} no puede estar vacía.`);
      }
      if (pregunta.opciones.length < 2) {
        throw new Error(`La pregunta ${index + 1} debe tener al menos 2 opciones.`);
      }
      if (!pregunta.opciones.includes(pregunta.respuesta_correcta)) {
        throw new Error(
          `La respuesta correcta de la pregunta ${index + 1} debe coincidir con una de sus opciones.`
        );
      }
    });

    await this.triviaRepository.createTrivia(trivia);
  }
}