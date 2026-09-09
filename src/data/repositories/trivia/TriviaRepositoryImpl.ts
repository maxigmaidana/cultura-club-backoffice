
import { supabase } from '@/data/datasources/supabase';
import type { Trivia } from '@/domain/entities/trivia/Trivia';
import type { ITriviaRepository, TriviaWithCategoria, TriviaDetail } from '@/domain/repositories/trivia/trivia_repository';

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
        opciones: pregunta.opciones,
        respuesta_correcta: pregunta.respuesta_correcta,
        puntos: pregunta.puntos,
      }))
    );

    if (preguntasError) {
      throw new Error(preguntasError.message);
    }
  }

  async getAllTrivias(): Promise<TriviaWithCategoria[]> {
    const { data, error } = await supabase
      .from('trivias')
      .select('id, titulo, categoria_id, estado, created_at, categorias(nombre)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as unknown as TriviaWithCategoria[];
  }

  async getTriviaById(triviaId: string): Promise<TriviaDetail> {
    const { data, error } = await supabase
      .from('trivias')
      .select('id, titulo, categoria_id, estado, created_at, categorias(nombre), trivia_preguntas(*)')
      .eq('id', triviaId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Trivia no encontrada');
    }

    return data as unknown as TriviaDetail;
  }

  async deleteTrivia(triviaId: string): Promise<void> {
    const { error } = await supabase.from('trivias').delete().eq('id', triviaId);

    if (error) {
      throw new Error(error.message);
    }
  }
}