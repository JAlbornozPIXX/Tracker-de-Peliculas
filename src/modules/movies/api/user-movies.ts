import { UNSEEN_EXCLUDED_STATUSES, type StatusKey } from '@/modules/movies/constants/status';
import { fetchAllRows, fetchByIdChunks } from '@/utils/fetch-all';
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
  const rows = await fetchAllRows<{ movie_id: number }>((from, to) =>
    supabase
      .from('user_movies')
      .select('movie_id', { count: 'exact' })
      .eq('user_id', userId)
      .in('status', UNSEEN_EXCLUDED_STATUSES)
      .order('movie_id')
      .range(from, to)
  );
  return rows.map((row) => row.movie_id);
}

// Ids de las películas Terminadas; con movieIds se limita a esas películas.
export async function getWatchedMovieIds(userId: string, movieIds?: number[]): Promise<Set<number>> {
  // El total solo hace falta al paginar; cada lote de ids cabe en una página.
  const watched = (withCount: boolean) =>
    supabase
      .from('user_movies')
      .select('movie_id', withCount ? { count: 'exact' } : {})
      .eq('user_id', userId)
      .eq('status', 'watched');

  const rows = movieIds
    ? await fetchByIdChunks(movieIds, async (ids) => {
        const { data, error } = await watched(false).in('movie_id', ids);
        if (error) throw error;
        return (data ?? []) as { movie_id: number }[];
      })
    : await fetchAllRows<{ movie_id: number }>((from, to) => watched(true).order('movie_id').range(from, to));
  return new Set(rows.map((row) => row.movie_id));
}

export type TrackedMovie = {
  movieId: number;
  status: StatusKey;
  rating: number | null;
  // Cuándo se puso el estado actual: ordena las secciones de Inicio.
  statusChangedAt: string | null;
  movie: { id: number; title: string; overview: string | null; poster_url: string | null } | null;
};

type TrackedMovieRow = {
  movie_id: number;
  status: StatusKey;
  rating: number | null;
  status_changed_at: string | null;
  movies: TrackedMovie['movie'];
};

// Todo el seguimiento del usuario con su película, para las secciones de Inicio.
export async function getTrackedMovies(userId: string): Promise<TrackedMovie[]> {
  const rows = await fetchAllRows<TrackedMovieRow>((from, to) =>
    supabase
      .from('user_movies')
      .select('movie_id, status, rating, status_changed_at, movies(id, title, overview, poster_url)', {
        count: 'exact',
      })
      .eq('user_id', userId)
      .order('movie_id')
      .range(from, to)
  );
  return rows.map((row) => ({
    movieId: row.movie_id,
    status: row.status,
    rating: row.rating,
    statusChangedAt: row.status_changed_at,
    movie: row.movies,
  }));
}
