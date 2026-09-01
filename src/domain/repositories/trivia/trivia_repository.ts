import type { Trivia } from "@/domain/entities/trivia/Trivia";

export interface ITriviaRepository {
  createTrivia(trivia: Trivia): Promise<void>;
}