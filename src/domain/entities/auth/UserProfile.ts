export type Role = 'SUPER_ADMIN' | 'ADMIN_CLUB' | 'ENTRENADOR' | 'JUGADOR';

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  nombre?: string;
  club_id?: string | null;
}
