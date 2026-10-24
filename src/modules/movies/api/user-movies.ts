import { UNSEEN_EXCLUDED_STATUSES, type StatusKey } from '@/modules/movies/constants/status';
import { supabase } from '@/utils/supabase';

export type UserMovieRow = {
  status: StatusKey;
  rating: number | null;
  notes: string | null;
};

export async function getUserMovie(userId: string, movieId: number): Promise<UserMovieRow | null> {
  const { data, error } = await supabase
    .from('user_movies')
    .select('status, rating, notes')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type UserMovieFields = {
  status?: StatusKey;
  rating?: number | null;
  notes?: string | null;
};

export type UserMovieField = keyof UserMovieFields;
export type UserMovieValue = Exclude<UserMovieFields[UserMovieField], undefined>;
// Hora del teléfono en que cambió cada campo.
export type ChangedAtByField = Partial<Record<UserMovieField, string>>;

// Columna con la hora del último cambio de cada campo. status_changed_at lo
// mueve el trigger de schema.sql (con updated_at) solo si el estado cambia.
const CHANGED_AT_COLUMN: Record<UserMovieField, string> = {
  status: 'status_changed_at',
  rating: 'rating_changed_at',
  notes: 'notes_changed_at',
};

// Las escrituras pasan por la cola de src/modules/sync: así un cambio sin red
// queda guardado en el teléfono y se sube después.

/**
 * Aplica un campo solo si en el servidor ese mismo campo no cambió después de
 * changedAt (gana el más reciente, campo por campo). applied es false si la
 * fila no existe o si el servidor tiene un cambio más nuevo de ese campo.
 */
export async function updateUserMovieFieldIfOlder(
  userId: string,
  movieId: number,
  field: UserMovieField,
  value: UserMovieValue,
  changedAt: string
) {
  const column = CHANGED_AT_COLUMN[field];
  const changes = field === 'status' ? { status: value } : { [field]: value, [column]: changedAt };
  const { data, error, status } = await supabase
    .from('user_movies')
    .update({ ...changes, updated_at: changedAt })
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .lte(column, changedAt)
    .select('movie_id');
  return { error, status, applied: (data?.length ?? 0) > 0 };
}

export async function userMovieExists(userId: string, movieId: number) {
  const { data, error, status } = await supabase
    .from('user_movies')
    .select('movie_id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .maybeSingle();
  return { error, status, exists: data != null };
}

/**
 * La única escritura que crea la fila: necesita status, que es NOT NULL sin
 * default. Por eso estrellas o nota nunca son la primera escritura. Los
 * campos que no vienen toman la hora del estado.
 */
export async function insertUserMovie(
  userId: string,
  movieId: number,
  fields: UserMovieFields,
  changedAt: ChangedAtByField & { status: string }
) {
  const times = [changedAt.status, changedAt.rating, changedAt.notes].filter((time): time is string => time != null);
  const { error, status } = await supabase.from('user_movies').insert({
    user_id: userId,
    movie_id: movieId,
    ...fields,
    updated_at: times.reduce((latest, time) => (time > latest ? time : latest)),
    status_changed_at: changedAt.status,
    rating_changed_at: changedAt.rating ?? changedAt.status,
    notes_changed_at: changedAt.notes ?? changedAt.status,
  });
  return { error, status };
}

export async function getDisqualifiedMovieIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('user_movies')
    .select('movie_id')
    .eq('user_id', userId)
    .in('status', UNSEEN_EXCLUDED_STATUSES);

  if (error) throw error;
  return (data ?? []).map((row) => row.movie_id);
}

// Ids de las películas Terminadas; con movieIds se limita a esas películas.
export async function getWatchedMovieIds(userId: string, movieIds?: number[]): Promise<Set<number>> {
  if (movieIds?.length === 0) return new Set();

  let query = supabase.from('user_movies').select('movie_id').eq('user_id', userId).eq('status', 'watched');
  if (movieIds) query = query.in('movie_id', movieIds);

  const { data, error } = await query;
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.movie_id));
}
