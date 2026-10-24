import { addMovieToList, createList, deleteList, removeMovieFromList } from '@/modules/lists/api/lists';
import { DEFAULT_LIST_KIND } from '@/modules/lists/constants/kinds';
import type { StatusKey } from '@/modules/movies/constants/status';
import { shameCutoff, shamePile } from '@/modules/watchlist/utils/shame';
import { fetchAllRows } from '@/utils/fetch-all';
import { supabase } from '@/utils/supabase';

export type ShameMovie = {
  id: number;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  days: number;
};

type WatchlistRowData = {
  status_changed_at: string;
  movies: { id: number; title: string; poster_url: string | null; release_date: string | null } | null;
};

/**
 * Pila de la vergüenza: películas que llevan 180 días o más en "Ver más
 * tarde", según status_changed_at (updated_at cambia al editar nota o estrellas).
 */
export async function getShamePile(userId: string, now = new Date()): Promise<ShameMovie[]> {
  const data = await fetchAllRows<WatchlistRowData>((from, to) =>
    supabase
      .from('user_movies')
      .select('status_changed_at, movies(id, title, poster_url, release_date)', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'watchlist')
      .lte('status_changed_at', shameCutoff(now).toISOString())
      .order('movie_id')
      .range(from, to)
  );

  const rows = data.flatMap(({ status_changed_at, movies: movie }) =>
    movie ? [{ status: 'watchlist' as const, statusChangedAt: status_changed_at, movie }] : []
  );
  return shamePile(rows, now).map(({ movie, days }) => ({
    id: movie.id,
    title: movie.title,
    posterUrl: movie.poster_url,
    releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
    days,
  }));
}

// "Mantener": la película sigue en Ver más tarde y su contador vuelve a cero.
export async function keepInWatchlist(userId: string, movieId: number, now = new Date()): Promise<void> {
  const { error } = await supabase
    .from('user_movies')
    .update({ status_changed_at: now.toISOString() })
    .eq('user_id', userId)
    .eq('movie_id', movieId);
  if (error) throw error;
}

// Fila completa de user_movies, para que "Deshacer" la deje exactamente igual
// (incluidas las horas de cada campo que usa la sincronización).
export type TrackingSnapshot = {
  status: StatusKey;
  rating: number | null;
  notes: string | null;
  updated_at: string;
  status_changed_at: string;
  rating_changed_at: string;
  notes_changed_at: string;
};

/**
 * Quita el seguimiento (user_movies). La película sigue en sus listas y
 * conserva vistas y calificadores, que no dependen de esta fila.
 */
export async function removeTracking(userId: string, movieId: number): Promise<TrackingSnapshot> {
  // DELETE ... RETURNING: la foto es justo la fila borrada, aunque otro cambio
  // (p. ej. la nota que la ficha guarda al salir) llegue en medio.
  const { data, error } = await supabase
    .from('user_movies')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .select('status, rating, notes, updated_at, status_changed_at, rating_changed_at, notes_changed_at')
    .single();
  if (error) throw error;
  return data;
}

export async function restoreTracking(userId: string, movieId: number, snapshot: TrackingSnapshot): Promise<void> {
  const { error } = await supabase.from('user_movies').insert({ user_id: userId, movie_id: movieId, ...snapshot });
  if (error) throw error;
}

export const SOMEDAY_LIST_NAME = 'Algún día';

async function getOrCreateSomedayList(userId: string): Promise<{ id: number; created: boolean }> {
  const { data, error } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', SOMEDAY_LIST_NAME)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return { id: data.id, created: false };

  const created = await createList(userId, SOMEDAY_LIST_NAME, DEFAULT_LIST_KIND);
  if (created.error) throw created.error;
  return { id: created.data.id, created: true };
}

export type MoveResult = {
  snapshot: TrackingSnapshot;
  listId: number;
  // false si la película ya estaba en "Algún día": deshacer no la saca de ahí.
  addedToList: boolean;
  // true si este movimiento creó "Algún día": deshacer la elimina.
  createdList: boolean;
};

const UNIQUE_VIOLATION = '23505';

// "Mover a lista": la agrega a "Algún día" (creándola si falta) y la saca de Ver más tarde.
export async function moveToSomedayList(userId: string, movieId: number): Promise<MoveResult> {
  const list = await getOrCreateSomedayList(userId);
  const added = await addMovieToList(list.id, movieId);
  if (added.error && added.error.code !== UNIQUE_VIOLATION) throw added.error;

  const snapshot = await removeTracking(userId, movieId);
  return { snapshot, listId: list.id, addedToList: !added.error, createdList: list.created };
}

export async function undoMove(userId: string, movieId: number, result: MoveResult): Promise<void> {
  await restoreTracking(userId, movieId, result.snapshot);
  if (result.createdList) {
    const { error } = await deleteList(result.listId);
    if (error) throw error;
  } else if (result.addedToList) {
    const { error } = await removeMovieFromList(result.listId, movieId);
    if (error) throw error;
  }
}
