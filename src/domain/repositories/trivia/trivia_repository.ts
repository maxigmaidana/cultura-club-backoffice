import type { Trivia } from "@/domain/entities/trivia/Trivia";

export interface TriviaWithCategoria {
  id: string;
  titulo: string;
  categoria_id: string;
  estado: string;
  created_at: string;
  categorias?: Array<{
    nombre: string;
  }> | null;
}

export interface TriviaDetail extends TriviaWithCategoria {
  trivia_preguntas: Array<{
    id: string;
    pregunta: string;
    opciones: string[];
    respuesta_correcta: string;
    puntos: number;
  }>;
}

export interface ITriviaRepository {
  createTrivia(trivia: Trivia): Promise<void>;
  getAllTrivias(): Promise<TriviaWithCategoria[]>;
  getTriviaById(triviaId: string): Promise<TriviaDetail>;
  deleteTrivia(triviaId: string): Promise<void>;
}