export interface Trivia {
  id?: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  puntos: number;
  estado: string;
  creador_id: string;
}