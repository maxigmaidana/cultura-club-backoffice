import { supabase } from '@/data/datasources/supabase';
import type { Categoria } from '@/domain/entities/categoria/Categoria';
import type { ICategoriaRepository } from '@/domain/repositories/categoria/categoria_repository';

export class CategoriaRepositoryImpl implements ICategoriaRepository {
  async getCategorias(clubId?: string | null): Promise<Categoria[]> {
    let query = supabase.from('categorias').select('id, nombre, club_id');

    if (clubId) {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query.order('nombre', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }
}
