export interface TriviaPregunta {
  id?: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  puntos: number;
}

export interface Trivia {
  id?: string;
  titulo: string;
  categoria_id: string;
  estado: string;
  creador_id: string;
  preguntas: TriviaPregunta[];
}