import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import { TriviaRepositoryImpl } from '@/data/repositories/trivia/TriviaRepositoryImpl';
import { GetTriviaDetailUseCase } from '@/aplication/use-cases/trivia/GetTriviaDetailUseCase';
import { DeleteTriviaUseCase } from '@/aplication/use-cases/trivia/DeleteTriviaUseCase';
import type { TriviaDetail } from '@/domain/repositories/trivia/trivia_repository';

const triviaRepository = new TriviaRepositoryImpl();
const getTriviaDetailUseCase = new GetTriviaDetailUseCase(triviaRepository);
const deleteTriviaUseCase = new DeleteTriviaUseCase(triviaRepository);

export function TriviaDetailPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id: triviaId } = useParams<{ id: string }>();
  const [trivia, setTrivia] = useState<TriviaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Defensa RBAC: solo ADMIN_CLUB y SUPER_ADMIN pueden ver detalles de trivias
  if (profile && profile.role !== 'ADMIN_CLUB' && profile.role !== 'SUPER_ADMIN') {
    return <Navigate to="/home" replace />;
  }

  useEffect(() => {
    const fetchTriviaDetail = async () => {
      try {
        if (!triviaId) {
          throw new Error('ID de trivia no proporcionado.');
        }

        setLoading(true);
        setError(null);
        const data = await getTriviaDetailUseCase.execute(triviaId);
        setTrivia(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar la trivia.';
        setError(message);
        console.error('Error fetching trivia detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTriviaDetail();
  }, [triviaId]);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la trivia "${trivia?.titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      if (triviaId) {
        await deleteTriviaUseCase.execute(triviaId);
        navigate('/trivias');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la trivia.';
      setError(message);
      console.error('Error deleting trivia:', err);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="h-1 w-full bg-[var(--brand-red)]" />
      <header className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <button
          onClick={() => navigate('/trivias')}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <h1 className="text-base font-bold sm:text-lg">Detalle de Trivia</h1>
        <div className="w-24" />
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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
            <p className="text-muted-foreground">Cargando trivia...</p>
          </div>
        ) : !trivia ? (
          <Card className="border-t-4 border-t-destructive p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="text-lg font-medium">Trivia no encontrada</p>
                <p className="text-sm text-muted-foreground">
                  La trivia que buscas no existe o fue eliminada.
                </p>
              </div>
              <Button onClick={() => navigate('/trivias')} className="mt-4">
                Volver a la lista
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="border-t-4 border-t-primary p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{trivia.titulo}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ID: {trivia.id}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Categoría</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {trivia.categorias?.[0]?.nombre || 'Sin categoría'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Estado</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          trivia.estado === 'activa'
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <p className="font-semibold capitalize text-foreground">
                        {trivia.estado || 'Sin estado'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-secondary/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Preguntas</p>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {trivia.trivia_preguntas?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full sm:w-auto"
                  >
                    {deleting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Eliminar trivia</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Preguntas */}
            {trivia.trivia_preguntas && trivia.trivia_preguntas.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Preguntas</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                    {trivia.trivia_preguntas.length}
                  </span>
                </div>

                {trivia.trivia_preguntas.map((pregunta, index) => (
                  <Card
                    key={pregunta.id}
                    className="border-l-4 border-l-primary overflow-hidden"
                  >
                    <div className="space-y-4 p-6">
                      {/* Número y texto de pregunta */}
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-foreground">
                              Pregunta {index + 1}
                            </h4>
                            <p className="mt-2 text-base text-foreground">
                              {pregunta.pregunta}
                            </p>
                          </div>
                          <div className="flex-shrink-0 rounded-lg bg-primary/10 px-3 py-1">
                            <p className="text-sm font-semibold text-primary">
                              {pregunta.puntos} pts
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Opciones */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Opciones
                        </p>
                        <div className="space-y-2">
                          {pregunta.opciones.map((opcion, optionIndex) => {
                            const isCorrect = opcion === pregunta.respuesta_correcta;
                            return (
                              <div
                                key={optionIndex}
                                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                                  isCorrect
                                    ? 'border-green-500/50 bg-green-50 dark:bg-green-950/30'
                                    : 'border-border bg-muted/30 hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex flex-shrink-0 items-center pt-0.5">
                                  {isCorrect ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-border bg-background" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm ${
                                      isCorrect
                                        ? 'font-semibold text-green-700 dark:text-green-400'
                                        : 'text-foreground'
                                    }`}
                                  >
                                    {opcion}
                                  </p>
                                  {isCorrect && (
                                    <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                                      Respuesta correcta
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">
                  Esta trivia no tiene preguntas asociadas.
                </p>
              </Card>
            )}

            {/* Botón para volver */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => navigate('/trivias')}>
                Volver a la lista
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
