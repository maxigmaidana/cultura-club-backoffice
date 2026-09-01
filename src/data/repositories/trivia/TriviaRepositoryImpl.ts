
import { supabase } from '@/data/datasources/supabase';
import type { Trivia } from '@/domain/entities/trivia/Trivia';
import type { ITriviaRepository } from '@/domain/repositories/trivia/trivia_repository';

export class TriviaRepositoryImpl implements ITriviaRepository {
  async createTrivia(trivia: Trivia): Promise<void> {
    const { error } = await supabase.from('trivias').insert([
      {
        pregunta: trivia.pregunta,
        opciones: JSON.stringify(trivia.opciones),
        respuesta_correcta: trivia.respuesta_correcta,
        puntos: trivia.puntos,
        estado: trivia.estado,
        creador_id: trivia.creador_id,
      }
    ]);

    if (error) {
      throw new Error(error.message);
    }
  }
}