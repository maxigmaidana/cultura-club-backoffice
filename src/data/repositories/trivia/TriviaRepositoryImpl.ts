
import { supabase } from '@/data/datasources/supabase';
import type { Trivia } from '@/domain/entities/trivia/Trivia';
import type { ITriviaRepository } from '@/domain/repositories/trivia/trivia_repository';

export class TriviaRepositoryImpl implements ITriviaRepository {
  async createTrivia(trivia: Trivia): Promise<void> {
    const { data: triviaCreada, error: triviaError } = await supabase
      .from('trivias')
      .insert([
        {
          titulo: trivia.titulo,
          categoria_id: trivia.categoria_id,
          creador_id: trivia.creador_id,
          estado: trivia.estado,
        },
      ])
      .select('id')
      .single();

    if (triviaError) {
      throw new Error(triviaError.message);
    }

    const { error: preguntasError } = await supabase.from('trivia_preguntas').insert(
      trivia.preguntas.map((pregunta) => ({
        trivia_id: triviaCreada.id,
        pregunta: pregunta.pregunta,
        opciones: JSON.stringify(pregunta.opciones),
        respuesta_correcta: pregunta.respuesta_correcta,
        puntos: pregunta.puntos,
      }))
    );

    if (preguntasError) {
      throw new Error(preguntasError.message);
    }
  }
}