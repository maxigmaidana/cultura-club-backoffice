import { supabase } from '@/data/datasources/supabase';
import type {
  AvailabilityCategory,
  BodySide,
  CategoriesForAvailabilityFilters,
  CreateInjuryInput,
  InjurySeverity,
  JsonValue,
  PlayerAvailability,
  PlayerAvailabilityContext,
  PlayerForAvailabilityFilters,
  PlayerForAvailability,
  PlayerUnavailability,
  PlayerUnavailabilityHistoryEvent,
  PlayerUnavailabilityMedicalDetails,
  PlayerUnavailabilityStaffDetails,
  PlayersForAvailabilityFilters,
  UnavailabilityStatus,
  UnavailabilityType,
  UpdateGeneralInjuryInput,
  UpdateMedicalAssessmentInput,
  UpdateMedicalDetailsInput,
  UpdateStaffNotesInput,
} from '@/domain/entities/availability/Availability';
import type { Role } from '@/domain/entities/auth/UserProfile';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

interface PlayerRow {
  usuario_id: string;
  categoria_id: string | null;
  sector_cancha: string | null;
  posiciones: string[] | string | null;
  foto_url: string | null;
  usuarios:
    | {
        id: string;
        nombre_completo: string;
        club_id: string | null;
      }
    | Array<{
        id: string;
        nombre_completo: string;
        club_id: string | null;
      }>
    | null;
  categorias:
    | {
        id: string;
        nombre: string;
        entrenador_id: string | null;
      }
    | Array<{
        id: string;
        nombre: string;
        entrenador_id: string | null;
      }>
    | null;
}

interface RpcAvailabilityRow {
  can_train: boolean;
  can_play: boolean;
  active_injuries_count: number;
}

interface UnavailabilityRow {
  id: string;
  club_id: string;
  player_id: string;
  category_id: string | null;
  type: UnavailabilityType;
  status: UnavailabilityStatus;
  title: string;
  description: string | null;
  body_area: string | null;
  body_side: BodySide;
  severity: InjurySeverity;
  start_date: string;
  estimated_return_date: string | null;
  can_train: boolean;
  can_play: boolean;
  requires_medical_clearance: boolean;
  player_notes: string | null;
  created_by: string;
  updated_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  relapse_of_id: string | null;
  created_at: string;
  updated_at: string;
}

interface StaffDetailsRow {
  unavailability_id: string;
  staff_notes: string | null;
  sports_recommendations: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface MedicalDetailsRow {
  unavailability_id: string;
  diagnosis: string | null;
  clinical_notes: string | null;
  treatment_plan: string | null;
  rehabilitation_plan: string | null;
  medical_recommendations: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface HistoryRow {
  id: string;
  unavailability_id: string;
  event_type: PlayerUnavailabilityHistoryEvent['eventType'];
  visibility: PlayerUnavailabilityHistoryEvent['visibility'];
  details: unknown;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

interface UsuarioRow {
  id: string;
  nombre_completo: string | null;
  email: string | null;
}

interface CategoriaRow {
  id: string;
  nombre: string;
  club_id: string | null;
  entrenador_id: string | null;
}

function normalizePosiciones(posiciones: string[] | string | null): string[] {
  if (!posiciones) {
    return [];
  }

  if (Array.isArray(posiciones)) {
    return posiciones.filter((value) => typeof value === 'string');
  }

  return posiciones
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function mapSupabaseErrorMessage(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes('permission denied') || message.includes('not authorized')) {
    return 'No tenes permisos para realizar esta accion.';
  }

  if (message.includes('doctor') || message.includes('medic')) {
    return 'Solo un medico puede modificar la disponibilidad o informacion clinica.';
  }

  if (message.includes('closed') || message.includes('cerrada')) {
    return 'La lesion ya fue cerrada y no puede editarse.';
  }

  if (message.includes('row-level security') || message.includes('violates row-level security')) {
    return 'No tenes permisos para acceder a estos datos.';
  }

  return rawMessage;
}

function extractSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === 'object') {
    const result: { [key: string]: JsonValue } = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      result[key] = normalizeJsonValue(item);
    });

    return result;
  }

  return String(value);
}

function normalizeHistoryDetails(value: unknown): JsonValue {
  if (typeof value === 'undefined') {
    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return normalizeJsonValue(parsed);
    } catch {
      return value;
    }
  }

  return normalizeJsonValue(value);
}

function mapUnavailability(row: UnavailabilityRow): PlayerUnavailability {
  return {
    id: row.id,
    clubId: row.club_id,
    playerId: row.player_id,
    categoryId: row.category_id,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    bodyArea: row.body_area,
    bodySide: row.body_side,
    severity: row.severity,
    startDate: row.start_date,
    estimatedReturnDate: row.estimated_return_date,
    canTrain: row.can_train,
    canPlay: row.can_play,
    requiresMedicalClearance: row.requires_medical_clearance,
    playerNotes: row.player_notes,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    closedBy: row.closed_by,
    closedAt: row.closed_at,
    relapseOfId: row.relapse_of_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAvailability(row: RpcAvailabilityRow | null, playerId: string): PlayerAvailability {
  return {
    playerId,
    canTrain: row?.can_train ?? true,
    canPlay: row?.can_play ?? true,
    activeInjuriesCount: row?.active_injuries_count ?? 0,
  };
}

export class AvailabilityRepositoryImpl implements IAvailabilityRepository {
  async getCategoriesForAvailability(
    filters: CategoriesForAvailabilityFilters
  ): Promise<AvailabilityCategory[]> {
    let query = supabase.from('categorias').select('id, nombre, club_id, entrenador_id');

    if (filters.role === 'ENTRENADOR') {
      query = query.eq('entrenador_id', filters.requesterId);
    }

    if ((filters.role === 'ADMIN_CLUB' || filters.role === 'DOCTOR') && filters.clubId) {
      query = query.eq('club_id', filters.clubId);
    }

    const { data, error } = await query.order('nombre', { ascending: true });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    return ((data ?? []) as CategoriaRow[]).map((row) => ({
      id: row.id,
      nombre: row.nombre,
      clubId: row.club_id,
      entrenadorId: row.entrenador_id,
    }));
  }

  async getPlayersForAvailability(filters: PlayersForAvailabilityFilters): Promise<PlayerForAvailability[]> {
    let query = supabase
      .from('jugadores_perfil')
      .select(
        'usuario_id, categoria_id, sector_cancha, posiciones, foto_url, usuarios!inner(id, nombre_completo, club_id), categorias(id, nombre, entrenador_id)'
      );

    if (filters.role === 'ENTRENADOR') {
      query = query.eq('categorias.entrenador_id', filters.requesterId);
    }

    if ((filters.role === 'ADMIN_CLUB' || filters.role === 'DOCTOR') && filters.clubId) {
      query = query.eq('usuarios.club_id', filters.clubId);
    }

    if (filters.categoryId) {
      query = query.eq('categoria_id', filters.categoryId);
    }

    if (filters.search && filters.search.trim().length > 0) {
      query = query.ilike('usuarios.nombre_completo', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    const rawPlayers = (data ?? []) as unknown as PlayerRow[];

    const playersWithAvailability = await Promise.all(
      rawPlayers.map(async (player) => {
        const availability = await this.getPlayerAvailability(player.usuario_id).catch(() => ({
          playerId: player.usuario_id,
          canTrain: true,
          canPlay: true,
          activeInjuriesCount: 0,
        }));

        const usuario = extractSingle(player.usuarios);
        const categoria = extractSingle(player.categorias);

        return {
          userId: player.usuario_id,
          nombreCompleto: usuario?.nombre_completo ?? 'Jugador sin nombre',
          categoriaId: player.categoria_id,
          categoriaNombre: categoria?.nombre ?? 'Sin categoria',
          sectorCancha: player.sector_cancha,
          posiciones: normalizePosiciones(player.posiciones),
          fotoUrl: player.foto_url,
          availability,
        };
      })
    );

    return playersWithAvailability.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
  }

  async getPlayerForAvailability(
    filters: PlayerForAvailabilityFilters
  ): Promise<PlayerAvailabilityContext | null> {
    let query = supabase
      .from('jugadores_perfil')
      .select(
        'usuario_id, categoria_id, sector_cancha, posiciones, foto_url, usuarios!inner(id, nombre_completo, club_id), categorias(id, nombre, entrenador_id)'
      )
      .eq('usuario_id', filters.playerId);

    if (filters.role === 'ENTRENADOR') {
      query = query.eq('categorias.entrenador_id', filters.requesterId);
    }

    if ((filters.role === 'ADMIN_CLUB' || filters.role === 'DOCTOR') && filters.clubId) {
      query = query.eq('usuarios.club_id', filters.clubId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    const row = data as PlayerRow | null;
    if (!row) {
      return null;
    }

    const usuario = extractSingle(row.usuarios);
    const categoria = extractSingle(row.categorias);

    return {
      userId: row.usuario_id,
      nombreCompleto: usuario?.nombre_completo ?? 'Jugador sin nombre',
      categoriaId: row.categoria_id,
      categoriaNombre: categoria?.nombre ?? 'Sin categoria',
      sectorCancha: row.sector_cancha,
      posiciones: normalizePosiciones(row.posiciones),
      fotoUrl: row.foto_url,
    };
  }

  async getPlayerAvailability(playerId: string): Promise<PlayerAvailability> {
    const { data, error } = await supabase.rpc('get_player_availability', {
      p_player_id: playerId,
    });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    const row = Array.isArray(data)
      ? ((data[0] as RpcAvailabilityRow | undefined) ?? null)
      : ((data as RpcAvailabilityRow | null) ?? null);

    return mapAvailability(row, playerId);
  }

  async getPlayerUnavailabilities(playerId: string): Promise<PlayerUnavailability[]> {
    const { data, error } = await supabase
      .from('player_unavailabilities')
      .select('*')
      .eq('player_id', playerId)
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    return ((data ?? []) as UnavailabilityRow[]).map(mapUnavailability);
  }

  async getUnavailabilityById(injuryId: string): Promise<PlayerUnavailability> {
    const { data, error } = await supabase
      .from('player_unavailabilities')
      .select('*')
      .eq('id', injuryId)
      .single();

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    return mapUnavailability(data as UnavailabilityRow);
  }

  async getStaffDetails(unavailabilityId: string): Promise<PlayerUnavailabilityStaffDetails | null> {
    const { data, error } = await supabase
      .from('player_unavailability_staff_details')
      .select('*')
      .eq('unavailability_id', unavailabilityId)
      .maybeSingle();

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    const row = data as StaffDetailsRow | null;
    if (!row) {
      return null;
    }

    return {
      unavailabilityId: row.unavailability_id,
      staffNotes: row.staff_notes,
      sportsRecommendations: row.sports_recommendations,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getMedicalDetails(unavailabilityId: string): Promise<PlayerUnavailabilityMedicalDetails | null> {
    const { data, error } = await supabase
      .from('player_unavailability_medical_details')
      .select('*')
      .eq('unavailability_id', unavailabilityId)
      .maybeSingle();

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    const row = data as MedicalDetailsRow | null;
    if (!row) {
      return null;
    }

    return {
      unavailabilityId: row.unavailability_id,
      diagnosis: row.diagnosis,
      clinicalNotes: row.clinical_notes,
      treatmentPlan: row.treatment_plan,
      rehabilitationPlan: row.rehabilitation_plan,
      medicalRecommendations: row.medical_recommendations,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getHistory(unavailabilityId: string): Promise<PlayerUnavailabilityHistoryEvent[]> {
    const { data, error } = await supabase
      .from('player_unavailability_history')
      .select('*')
      .eq('unavailability_id', unavailabilityId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    const historyRows = (data ?? []) as HistoryRow[];
    const changedByIds = Array.from(
      new Set(historyRows.map((row) => row.changed_by).filter((value): value is string => Boolean(value)))
    );

    const usersMap = new Map<string, string>();

    if (changedByIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, email')
        .in('id', changedByIds);

      if (usersError) {
        throw new Error(mapSupabaseErrorMessage(usersError.message));
      }

      ((usersData ?? []) as UsuarioRow[]).forEach((user) => {
        usersMap.set(user.id, user.nombre_completo || user.email || user.id);
      });
    }

    return historyRows.map((row) => ({
      id: row.id,
      unavailabilityId: row.unavailability_id,
      eventType: row.event_type,
      visibility: row.visibility,
      details: normalizeHistoryDetails(row.details),
      notes: row.notes,
      changedBy: row.changed_by,
      changedByName: row.changed_by ? (usersMap.get(row.changed_by) ?? row.changed_by) : null,
      createdAt: row.created_at,
    }));
  }

  async createInjury(input: CreateInjuryInput, role: Role): Promise<string> {
    const isDoctor = role === 'DOCTOR';

    const payload: Record<string, unknown> = {
      p_player_id: input.playerId,
      p_title: input.title,
      p_start_date: input.startDate,
      p_description: input.description ?? null,
      p_body_area: input.bodyArea ?? null,
      p_body_side: input.bodySide ?? 'NOT_APPLICABLE',
      p_severity: input.severity ?? 'MODERATE',
      p_staff_notes: input.staffNotes ?? null,
      p_relapse_of_id: input.relapseOfId ?? null,
    };

    if (isDoctor) {
      payload.p_player_notes = input.playerNotes ?? null;
      payload.p_sports_recommendations = input.sportsRecommendations ?? null;
      payload.p_estimated_return_date = input.estimatedReturnDate ?? null;
      payload.p_can_train = input.canTrain ?? false;
      payload.p_can_play = input.canPlay ?? false;
      payload.p_diagnosis = input.diagnosis ?? null;
      payload.p_clinical_notes = input.clinicalNotes ?? null;
      payload.p_treatment_plan = input.treatmentPlan ?? null;
      payload.p_rehabilitation_plan = input.rehabilitationPlan ?? null;
      payload.p_medical_recommendations = input.medicalRecommendations ?? null;
    }

    const { data, error } = await supabase.rpc('create_player_injury', payload);

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data && typeof data === 'object' && 'id' in data && typeof data.id === 'string') {
      return data.id;
    }

    const { data: latestInjury, error: latestError } = await supabase
      .from('player_unavailabilities')
      .select('id')
      .eq('player_id', input.playerId)
      .eq('title', input.title)
      .eq('start_date', input.startDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestInjury) {
      throw new Error('La lesion fue creada, pero no se pudo recuperar su identificador.');
    }

    return latestInjury.id;
  }

  async updateGeneralInjury(input: UpdateGeneralInjuryInput): Promise<void> {
    const { data: current, error: readError } = await supabase
      .from('player_unavailabilities')
      .select('status')
      .eq('id', input.injuryId)
      .single();

    if (readError) {
      throw new Error(mapSupabaseErrorMessage(readError.message));
    }

    if (current.status === 'CLOSED') {
      throw new Error('La lesion ya fue cerrada y no puede editarse.');
    }

    const { error } = await supabase
      .from('player_unavailabilities')
      .update({
        title: input.title,
        description: input.description,
        body_area: input.bodyArea,
        body_side: input.bodySide,
        severity: input.severity,
        start_date: input.startDate,
        relapse_of_id: input.relapseOfId ?? null,
      })
      .eq('id', input.injuryId);

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }
  }

  async updateStaffNotes(input: UpdateStaffNotesInput): Promise<void> {
    const payload: Record<string, string> = {
      unavailability_id: input.injuryId,
      staff_notes: input.staffNotes,
    };

    if (typeof input.sportsRecommendations === 'string') {
      payload.sports_recommendations = input.sportsRecommendations;
    }

    const { error } = await supabase
      .from('player_unavailability_staff_details')
      .upsert(payload, { onConflict: 'unavailability_id' });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }
  }

  async updateMedicalAssessment(input: UpdateMedicalAssessmentInput): Promise<void> {
    const { data: current, error: readError } = await supabase
      .from('player_unavailabilities')
      .select('status')
      .eq('id', input.injuryId)
      .single();

    if (readError) {
      throw new Error(mapSupabaseErrorMessage(readError.message));
    }

    if (current.status === 'CLOSED') {
      throw new Error('La lesion ya fue cerrada y no puede editarse.');
    }

    const { error } = await supabase
      .from('player_unavailabilities')
      .update({
        status: input.status,
        can_train: input.canTrain,
        can_play: input.canPlay,
        estimated_return_date: input.estimatedReturnDate ?? null,
        player_notes: input.playerNotes ?? null,
      })
      .eq('id', input.injuryId);

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }
  }

  async updateMedicalDetails(input: UpdateMedicalDetailsInput): Promise<void> {
    const { error } = await supabase
      .from('player_unavailability_medical_details')
      .upsert({
        unavailability_id: input.injuryId,
        diagnosis: input.diagnosis,
        clinical_notes: input.clinicalNotes,
        treatment_plan: input.treatmentPlan,
        rehabilitation_plan: input.rehabilitationPlan,
        medical_recommendations: input.medicalRecommendations,
      }, { onConflict: 'unavailability_id' });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }
  }

  async closeInjury(injuryId: string): Promise<void> {
    const { error } = await supabase.rpc('close_player_unavailability', {
      p_unavailability_id: injuryId,
    });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }
  }
}
