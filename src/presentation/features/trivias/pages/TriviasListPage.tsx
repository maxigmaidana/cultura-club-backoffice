import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Trash2, AlertCircle, Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import { TriviaRepositoryImpl } from '@/data/repositories/trivia/TriviaRepositoryImpl';
import { GetAllTriviasUseCase } from '@/aplication/use-cases/trivia/GetAllTriviasUseCase';
import { DeleteTriviaUseCase } from '@/aplication/use-cases/trivia/DeleteTriviaUseCase';
import type { TriviaWithCategoria } from '@/domain/repositories/trivia/trivia_repository';

const triviaRepository = new TriviaRepositoryImpl();
const getAllTriviasUseCase = new GetAllTriviasUseCase(triviaRepository);
const deleteTriviaUseCase = new DeleteTriviaUseCase(triviaRepository);

export function TriviasListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [trivias, setTrivias] = useState<TriviaWithCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Defensa RBAC: solo ADMIN_CLUB y SUPER_ADMIN pueden gestionar trivias
  if (profile && profile.role !== 'ADMIN_CLUB' && profile.role !== 'SUPER_ADMIN') {
    return <Navigate to="/home" replace />;
  }

  useEffect(() => {
    const fetchTrivias = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllTriviasUseCase.execute();
        setTrivias(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar las trivias.';
        setError(message);
        console.error('Error fetching trivias:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrivias();
  }, [profile?.club_id]);

  const handleDelete = async (triviaId: string, triviaTitle: string) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar la trivia "${triviaTitle}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(triviaId);
      await deleteTriviaUseCase.execute(triviaId);
      setTrivias((prev) => prev.filter((t) => t.id !== triviaId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la trivia.';
      setError(message);
      console.error('Error deleting trivia:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Agrupar trivias por categoría
  const groupedByCategory = trivias.reduce(
    (acc, trivia) => {
      const categoryName = trivia.categorias?.[0]?.nombre || 'Sin categoría';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(trivia);
      return acc;
    },
    {} as Record<string, TriviaWithCategoria[]>
  );

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold sm:text-lg">Gestionar Trivias</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/home')}>
          Volver al Home
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando trivias...</p>
          </div>
        ) : trivias.length === 0 ? (
          /* Empty state */
          <Card className="border-t-4 border-t-primary p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">No hay trivias disponibles</p>
                <p className="text-sm text-muted-foreground">
                  Comienza creando una nueva trivia
                </p>
              </div>
              <Button onClick={() => navigate('/generate-trivia')} className="mt-4">
                Crear Trivia
              </Button>
            </div>
          </Card>
        ) : (
          /* Trivias grouped by category */
          <div className="space-y-8">
            {Object.entries(groupedByCategory).map(([categoryName, categoryTrivias]) => (
              <section key={categoryName}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">{categoryName}</h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {categoryTrivias.length}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTrivias.map((trivia) => (
                    <Card
                      key={trivia.id}
                      className="border-l-4 border-l-primary transition-all hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 p-4">
                        {/* Contenido clickeable para navegar al detalle */}
                        <div
                          onClick={() => navigate(`/trivias/${trivia.id}`)}
                          className="cursor-pointer space-y-3"
                        >
                          {/* Trivia Title */}
                          <div>
                            <h3 className="line-clamp-2 text-base font-semibold text-foreground hover:text-primary transition-colors">
                              {trivia.titulo}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Creada el {new Date(trivia.created_at).toLocaleDateString('es-AR')}
                            </p>
                          </div>

                          {/* Status badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                trivia.estado === 'activa'
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              }`}
                            />
                            <span className="text-xs font-medium capitalize text-muted-foreground">
                              {trivia.estado || 'Sin estado'}
                            </span>
                          </div>
                        </div>

                        {/* Delete button - fuera de la zona clickeable */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(trivia.id!, trivia.titulo)}
                          disabled={deletingId === trivia.id}
                          className="mt-2 w-full"
                        >
                          {deletingId === trivia.id ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              <span>Eliminando...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span>Eliminar</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}

            {/* Action button to create new trivia */}
            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate('/generate-trivia')} size="lg">
                + Crear Nueva Trivia
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
