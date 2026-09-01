import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TriviaRepositoryImpl } from '@/data/repositories/trivia/TriviaRepositoryImpl'
import { CreateTriviaUseCase } from '@/aplication/use-cases/trivia/CreateTriviaUseCase'
import { CategoriaRepositoryImpl } from '@/data/repositories/categoria/CategoriaRepositoryImpl'
import { GetCategoriasUseCase } from '@/aplication/use-cases/categoria/GetCategoriasUseCase'
import type { Categoria } from '@/domain/entities/categoria/Categoria'
import { useAuth } from '@/presentation/features/auth/context/AuthContext'

// Instanciamos las dependencias (en un proyecto más grande esto se inyecta con Context o un Container)
const triviaRepository = new TriviaRepositoryImpl()
const createTriviaUseCase = new CreateTriviaUseCase(triviaRepository)
const categoriaRepository = new CategoriaRepositoryImpl()
const getCategoriasUseCase = new GetCategoriasUseCase(categoriaRepository)

interface PreguntaFormState {
  key: string
  pregunta: string
  opciones: string[]
  respuestaCorrectaIndex: number | null
  puntos: string
}

function crearPreguntaVacia(): PreguntaFormState {
  return {
    key: crypto.randomUUID(),
    pregunta: '',
    opciones: ['', ''],
    respuestaCorrectaIndex: null,
    puntos: '10',
  }
}

export function CreateTriviaForm() {
  const { profile } = useAuth()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaId, setCategoriaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [preguntas, setPreguntas] = useState<PreguntaFormState[]>([crearPreguntaVacia()])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null)

  useEffect(() => {
    getCategoriasUseCase
      .execute(profile?.club_id)
      .then(setCategorias)
      .catch((err) => {
        console.error('Error al cargar las categorías:', err)
      })
  }, [profile?.club_id])

  const handleAgregarPregunta = () => {
    setPreguntas([...preguntas, crearPreguntaVacia()])
  }

  const handleEliminarPregunta = (key: string) => {
    if (preguntas.length > 1) {
      setPreguntas(preguntas.filter((p) => p.key !== key))
    }
  }

  const handleCambiarCampoPregunta = <K extends keyof PreguntaFormState>(
    key: string,
    campo: K,
    valor: PreguntaFormState[K]
  ) => {
    setPreguntas(
      preguntas.map((p) => (p.key === key ? { ...p, [campo]: valor } : p))
    )
  }

  const handleAgregarOpcion = (key: string) => {
    setPreguntas(
      preguntas.map((p) =>
        p.key === key && p.opciones.length < 5 ? { ...p, opciones: [...p.opciones, ''] } : p
      )
    )
  }

  const handleCambiarOpcion = (key: string, index: number, valor: string) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.key !== key) return p
        const nuevasOpciones = [...p.opciones]
        nuevasOpciones[index] = valor
        return { ...p, opciones: nuevasOpciones }
      })
    )
  }

  const handleEliminarOpcion = (key: string, index: number) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.key !== key || p.opciones.length <= 2) return p
        const nuevoIndiceCorrecta =
          p.respuestaCorrectaIndex === null
            ? null
            : p.respuestaCorrectaIndex === index
              ? null
              : p.respuestaCorrectaIndex > index
                ? p.respuestaCorrectaIndex - 1
                : p.respuestaCorrectaIndex
        return {
          ...p,
          opciones: p.opciones.filter((_, i) => i !== index),
          respuestaCorrectaIndex: nuevoIndiceCorrecta,
        }
      })
    )
  }

  const resetForm = () => {
    setTitulo('')
    setCategoriaId('')
    setPreguntas([crearPreguntaVacia()])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensaje(null)

    try {
      if (!profile) {
        throw new Error('No se pudo identificar al usuario logueado.')
      }

      preguntas.forEach((p, index) => {
        if (p.respuestaCorrectaIndex === null) {
          throw new Error(`Marcá la respuesta correcta de la pregunta ${index + 1}.`)
        }
      })

      await createTriviaUseCase.execute({
        titulo,
        categoria_id: categoriaId,
        estado: 'publicada',
        creador_id: profile.id,
        preguntas: preguntas.map((p) => ({
          pregunta: p.pregunta,
          opciones: p.opciones,
          respuesta_correcta: p.opciones[p.respuestaCorrectaIndex as number],
          puntos: parseInt(p.puntos) || 10,
        })),
      })

      setMensaje({ texto: '¡Trivia creada y publicada con éxito!', error: false })
      resetForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al guardar.'
      setMensaje({ texto: message, error: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Crear Nueva Trivia</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título de la Trivia</label>
            <Input
              placeholder="Ej: Especial Libertadores"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={categoriaId} onValueChange={(value) => setCategoriaId(value ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná una categoría">
                  {(value: string | null) =>
                    categorias.find((categoria) => categoria.id === value)?.nombre ??
                    'Seleccioná una categoría'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {preguntas.map((p, index) => (
              <div key={p.key} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Pregunta {index + 1}</h3>
                  {preguntas.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleEliminarPregunta(p.key)}
                    >
                      Quitar pregunta
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Pregunta</label>
                  <Input
                    placeholder="Ej: ¿En qué año debutó Bochini en Independiente?"
                    value={p.pregunta}
                    onChange={(e) => handleCambiarCampoPregunta(p.key, 'pregunta', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Opciones de respuesta (2 a 5)</label>
                  <p className="text-xs text-muted-foreground">
                    Marcá el circulo de la opción correcta.
                  </p>
                  {p.opciones.map((op, opIndex) => (
                    <div key={opIndex} className="flex gap-2 items-center">
                      <input
                        type="radio"
                        name={`respuesta-correcta-${p.key}`}
                        checked={p.respuestaCorrectaIndex === opIndex}
                        onChange={() =>
                          handleCambiarCampoPregunta(p.key, 'respuestaCorrectaIndex', opIndex)
                        }
                        className="size-4 shrink-0 accent-[var(--brand-red)]"
                        aria-label={`Marcar opción ${opIndex + 1} como correcta`}
                      />
                      <Input
                        placeholder={`Opción ${opIndex + 1}`}
                        value={op}
                        onChange={(e) => handleCambiarOpcion(p.key, opIndex, e.target.value)}
                        required
                      />
                      {p.opciones.length > 2 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEliminarOpcion(p.key, opIndex)}
                        >
                          X
                        </Button>
                      )}
                    </div>
                  ))}
                  {p.opciones.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAgregarOpcion(p.key)}
                      className="mt-1"
                    >
                      + Agregar Opción
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Puntaje</label>
                  <Input
                    type="number"
                    value={p.puntos}
                    onChange={(e) => handleCambiarCampoPregunta(p.key, 'puntos', e.target.value)}
                    required
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAgregarPregunta}>
              + Añadir otra pregunta
            </Button>
          </div>

          {mensaje && (
            <div className={`p-3 rounded text-sm ${mensaje.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {mensaje.texto}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Publicar Trivia'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
