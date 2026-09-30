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
  UpdatePlayerInjuryFullInput,
  UpdateStaffNotesInput,
} from '@/domain/entities/availability/Availability';
import type {
  CreateAttachmentSignedUrlInput,
  CreateLinkAttachmentInput,
  DeleteAttachmentInput,
  PlayerUnavailabilityAttachment,
  UploadFileAttachmentInput,
} from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import type { Role } from '@/domain/entities/auth/UserProfile';
import type { IAvailabilityRepository } from '@/domain/repositories/availability/availability_repository';

const ATTACHMENTS_BUCKET = 'medical-attachments';
const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

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
  has_recovering_injury: boolean;
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

interface AttachmentRow {
  id: string;
  unavailability_id: string;
  attachment_type: 'LINK' | 'FILE';
  title: string;
  description: string | null;
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string;
  created_at: string;
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

  if (message.includes('invalid input syntax for type date')) {
    return 'Alguna fecha ingresada no es valida. Revisa los datos e intenta nuevamente.';
  }

  if (message.includes('sqlstate')) {
    return 'No se pudo completar la operacion en este momento. Intenta nuevamente.';
  }

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

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapAttachmentRow(row: AttachmentRow): PlayerUnavailabilityAttachment {
  return {
    id: row.id,
    unavailabilityId: row.unavailability_id,
    attachmentType: row.attachment_type,
    title: row.title,
    description: row.description,
    externalUrl: row.external_url,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
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
    hasRecoveringInjury: row?.has_recovering_injury ?? false,
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
          hasRecoveringInjury: false,
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
      p_description: normalizeOptionalText(input.description),
      p_body_area: normalizeOptionalText(input.bodyArea),
      p_body_side: input.bodySide ?? 'NOT_APPLICABLE',
      p_severity: input.severity ?? 'MODERATE',
      p_staff_notes: normalizeOptionalText(input.staffNotes),
      p_relapse_of_id: normalizeOptionalText(input.relapseOfId),
    };

    if (isDoctor) {
      payload.p_player_notes = normalizeOptionalText(input.playerNotes);
      payload.p_sports_recommendations = normalizeOptionalText(input.sportsRecommendations);
      payload.p_estimated_return_date = normalizeOptionalDate(input.estimatedReturnDate);
      payload.p_can_train = input.canTrain ?? false;
      payload.p_can_play = input.canPlay ?? false;
      payload.p_diagnosis = normalizeOptionalText(input.diagnosis);
      payload.p_clinical_notes = normalizeOptionalText(input.clinicalNotes);
      payload.p_treatment_plan = normalizeOptionalText(input.treatmentPlan);
      payload.p_rehabilitation_plan = normalizeOptionalText(input.rehabilitationPlan);
      payload.p_medical_recommendations = normalizeOptionalText(input.medicalRecommendations);
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

  async updatePlayerInjuryFull(input: UpdatePlayerInjuryFullInput): Promise<void> {
    const { error } = await supabase.rpc('update_player_injury_full', {
      p_unavailability_id: input.unavailabilityId,
      p_title: input.title,
      p_description: normalizeOptionalText(input.description),
      p_body_area: normalizeOptionalText(input.bodyArea),
      p_body_side: input.bodySide,
      p_severity: input.severity,
      p_start_date: input.startDate,

      p_status: input.status,
      p_can_train: input.canTrain,
      p_can_play: input.canPlay,
      p_estimated_return_date: normalizeOptionalDate(input.estimatedReturnDate),
      p_player_notes: normalizeOptionalText(input.playerNotes),

      p_staff_notes: normalizeOptionalText(input.staffNotes),
      p_sports_recommendations: normalizeOptionalText(input.sportsRecommendations),

      p_diagnosis: normalizeOptionalText(input.diagnosis),
      p_clinical_notes: normalizeOptionalText(input.clinicalNotes),
      p_treatment_plan: normalizeOptionalText(input.treatmentPlan),
      p_rehabilitation_plan: normalizeOptionalText(input.rehabilitationPlan),
      p_medical_recommendations: normalizeOptionalText(input.medicalRecommendations),
    });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }
  }

  async getUnavailabilityAttachments(unavailabilityId: string): Promise<PlayerUnavailabilityAttachment[]> {
    const { data, error } = await supabase
      .from('player_unavailability_attachments')
      .select('*')
      .eq('unavailability_id', unavailabilityId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    return ((data ?? []) as AttachmentRow[]).map(mapAttachmentRow);
  }

  async createLinkAttachment(input: CreateLinkAttachmentInput): Promise<PlayerUnavailabilityAttachment> {
    const normalizedTitle = input.title.trim();
    const normalizedUrl = input.url.trim();

    if (normalizedTitle.length === 0) {
      throw new Error('El titulo es obligatorio.');
    }

    if (!/^https?:\/\//i.test(normalizedUrl)) {
      throw new Error('La URL debe comenzar con http:// o https://.');
    }

    const { data, error } = await supabase
      .from('player_unavailability_attachments')
      .insert({
        unavailability_id: input.unavailabilityId,
        attachment_type: 'LINK',
        title: normalizedTitle,
        description: normalizeOptionalText(input.description),
        external_url: normalizedUrl,
        storage_bucket: null,
        storage_path: null,
        original_filename: null,
        mime_type: null,
        file_size_bytes: null,
        uploaded_by: input.uploadedBy,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    return mapAttachmentRow(data as AttachmentRow);
  }

  async uploadFileAttachment(input: UploadFileAttachmentInput): Promise<PlayerUnavailabilityAttachment> {
    const normalizedTitle = input.title.trim();

    if (normalizedTitle.length === 0) {
      throw new Error('El titulo es obligatorio.');
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(input.file.type)) {
      throw new Error('El tipo de archivo no esta permitido.');
    }

    if (input.file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error('El archivo supera el limite de 50 MB.');
    }

    const normalizedFilename = normalizeFileName(input.file.name);
    const safeFilename = normalizedFilename.length > 0 ? normalizedFilename : 'archivo';
    const storagePath = `${input.clubId}/${input.playerId}/${input.unavailabilityId}/${crypto.randomUUID()}-${safeFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(mapSupabaseErrorMessage(uploadError.message));
    }

    const { data, error } = await supabase
      .from('player_unavailability_attachments')
      .insert({
        unavailability_id: input.unavailabilityId,
        attachment_type: 'FILE',
        title: normalizedTitle,
        description: normalizeOptionalText(input.description),
        external_url: null,
        storage_bucket: ATTACHMENTS_BUCKET,
        storage_path: storagePath,
        original_filename: input.file.name,
        mime_type: input.file.type,
        file_size_bytes: input.file.size,
        uploaded_by: input.uploadedBy,
      })
      .select('*')
      .single();

    if (error) {
      const { error: cleanupError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove([storagePath]);

      if (cleanupError) {
        console.error('No se pudo eliminar el archivo huerfano tras fallo de metadata:', cleanupError);
      }

      throw new Error(mapSupabaseErrorMessage(error.message));
    }

    return mapAttachmentRow(data as AttachmentRow);
  }

  async deleteAttachment(input: DeleteAttachmentInput): Promise<void> {
    const { attachment } = input;

    if (attachment.attachmentType === 'FILE') {
      if (!attachment.storageBucket || !attachment.storagePath) {
        throw new Error('No se encontro la referencia del archivo a eliminar.');
      }

      const { error: storageError } = await supabase.storage
        .from(attachment.storageBucket)
        .remove([attachment.storagePath]);

      if (storageError) {
        console.error('Error al eliminar archivo de storage:', storageError);
        throw new Error('No se pudo eliminar el archivo del almacenamiento.');
      }
    }

    const { error: metadataError } = await supabase
      .from('player_unavailability_attachments')
      .delete()
      .eq('id', attachment.id);

    if (metadataError) {
      console.error('Error al eliminar metadata de adjunto:', metadataError);
      throw new Error(mapSupabaseErrorMessage(metadataError.message));
    }
  }

  async createAttachmentSignedUrl(input: CreateAttachmentSignedUrlInput): Promise<string> {
    const { data, error } = await supabase.storage
      .from(input.storageBucket)
      .createSignedUrl(input.storagePath, input.expiresInSeconds ?? 60, {
        download: input.downloadFilename,
      });

    if (error || !data?.signedUrl) {
      throw new Error(mapSupabaseErrorMessage(error?.message ?? 'No se pudo generar el acceso temporal.'));
    }

    return data.signedUrl;
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
