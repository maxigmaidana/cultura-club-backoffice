import type { Categoria } from "@/domain/entities/categoria/Categoria";

export interface ICategoriaRepository {
  getCategorias(clubId?: string | null): Promise<Categoria[]>;
}
