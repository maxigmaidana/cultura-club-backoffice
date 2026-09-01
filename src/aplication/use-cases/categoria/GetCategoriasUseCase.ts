import type { ICategoriaRepository } from "@/domain/repositories/categoria/categoria_repository";
import type { Categoria } from "@/domain/entities/categoria/Categoria";

export class GetCategoriasUseCase {
  private categoriaRepository: ICategoriaRepository;

  constructor(categoriaRepository: ICategoriaRepository) {
    this.categoriaRepository = categoriaRepository;
  }

  async execute(clubId?: string | null): Promise<Categoria[]> {
    return this.categoriaRepository.getCategorias(clubId);
  }
}
