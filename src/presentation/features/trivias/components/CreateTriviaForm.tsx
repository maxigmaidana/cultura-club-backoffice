import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TriviaRepositoryImpl } from '@/data/repositories/trivia/TriviaRepositoryImpl'
import { CreateTriviaUseCase } from '@/aplication/use-cases/trivia/CreateTriviaUseCase'

// Instanciamos las dependencias (en un proyecto más grande esto se inyecta con Context o un Container)
const triviaRepository = new TriviaRepositoryImpl()
const createTriviaUseCase = new CreateTriviaUseCase(triviaRepository)

export function CreateTriviaForm() {
  const [pregunta, setPregunta] = useState('')
  const [opciones, setOpciones] = useState<string[]>(['', ''])
  const [respuestaCorrecta, setRespuestaCorrecta] = useState('')
  const [puntos, setPuntos] = useState('10')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null)

  const handleAgregarOpcion = () => {
    if (opciones.length < 5) {
      setOpciones([...opciones, ''])
    }
  }

  const handleCambiarOpcion = (index: number, valor: string) => {
    const nuevasOpciones = [...opciones]
    nuevasOpciones[index] = valor
    setOpciones(nuevasOpciones)
  }

  const handleEliminarOpcion = (index: number) => {
    if (opciones.length > 2) {
      const nuevasOpciones = opciones.filter((_, i) => i !== index)
      setOpciones(nuevasOpciones)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensaje(null)

    try {
      if (!opciones.includes(respuestaCorrecta)) {
        throw new Error('La respuesta correcta debe coincidir exactamente con una de las opciones.')
      }

      await createTriviaUseCase.execute({
        pregunta,
        opciones,
        respuesta_correcta: respuestaCorrecta,
        puntos: parseInt(puntos) || 10,
        estado: 'publicada',
        creador_id: '00000000-0000-0000-0000-000000000000'
      })

      setMensaje({ texto: '¡Trivia creada y publicada con éxito!', error: false })
      setPregunta('')
      setOpciones(['', ''])
      setRespuestaCorrecta('')
    } catch (err: any) {
      setMensaje({ texto: err.message || 'Ocurrió un error al guardar.', error: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Crear Nueva Trivia</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pregunta</label>
            <Input
              placeholder="Ej: ¿En qué año debutó Bochini en Independiente?"
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Opciones de respuesta (2 a 5)</label>
            {opciones.map((op, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder={`Opción ${index + 1}`}
                  value={op}
                  onChange={(e) => handleCambiarOpcion(index, e.target.value)}
                  required
                />
                {opciones.length > 2 && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleEliminarOpcion(index)}
                  >
                    X
                  </Button>
                )}
              </div>
            ))}
            {opciones.length < 5 && (
              <Button type="button" variant="outline" size="sm" onClick={handleAgregarOpcion} className="mt-1">
                + Agregar Opción
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Respuesta Correcta (exacta)</label>
            <Input
              placeholder="Debe ser idéntica a una de las opciones"
              value={respuestaCorrecta}
              onChange={(e) => setRespuestaCorrecta(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Puntaje</label>
            <Input
              type="number"
              value={puntos}
              onChange={(e) => setPuntos(e.target.value)}
              required
            />
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