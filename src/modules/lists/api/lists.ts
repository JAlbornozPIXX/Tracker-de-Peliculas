import { DEFAULT_LIST_KIND, ListKind } from '@/modules/lists/constants/kinds';
import { sortListMovies } from '@/modules/lists/utils/list-order';
import { supabase } from '@/utils/supabase';

export type ListSummary = {
  id: number;
  name: string;
  kind: ListKind;
  movieCount: number;
};

export type MovieCardData = {
  id: number;
  title: string;
  poster_url: string | null;
  release_date: string | null;
};

export type ListMovie = MovieCardData & {
  tmdb_id: number | null;
  media_type: 'movie' | 'tv' | null;
  position: number | null;
  added_at: string;
};

export type ListWithMovies = {
  id: number;
  name: string;
  kind: ListKind;
  movies: ListMovie[];
};

export const LIST_NAME_MAX = 60;

export async function getLists(userId: string): Promise<ListSummary[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, kind, list_movies(count)')
    .eq('user_id', userId)
    .order('created_at');

  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: number; name: string; kind: ListKind; list_movies: { count: number }[] }[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind ?? DEFAULT_LIST_KIND,
    movieCount: row.list_movies[0]?.count ?? 0,
  }));
}

const LIST_WITH_MOVIES_COLUMNS =
  'id, name, kind, list_movies(added_at, position, movies(id, title, poster_url, release_date, tmdb_id, media_type))';

type ListWithMoviesRow = {
  id: number;
  name: string;
  kind: ListKind;
  list_movies: { added_at: string; position: number | null; movies: Omit<ListMovie, 'position' | 'added_at'> | null }[];
};

function toListWithMovies(row: ListWithMoviesRow): ListWithMovies {
  const kind = row.kind ?? DEFAULT_LIST_KIND;
  const movies = row.list_movies.flatMap((item) =>
    item.movies ? [{ ...item.movies, position: item.position, added_at: item.added_at }] : []
  );
  return { id: row.id, name: row.name, kind, movies: sortListMovies(kind, movies) };
}

export async function getListWithMovies(listId: number): Promise<ListWithMovies | null> {
  const { data, error } = await supabase.from('lists').select(LIST_WITH_MOVIES_COLUMNS).eq('id', listId).maybeSingle();

  if (error) throw error;
  return data ? toListWithMovies(data as unknown as ListWithMoviesRow) : null;
}

export async function getListsWithMovies(userId: string): Promise<ListWithMovies[]> {
  const { data, error } = await supabase
    .from('lists')
    .select(LIST_WITH_MOVIES_COLUMNS)
    .eq('user_id', userId)
    .order('created_at');

  if (error) throw error;
  return ((data ?? []) as unknown as ListWithMoviesRow[]).map(toListWithMovies);
}

const MOVIE_CARD_COLUMNS = 'id, title, poster_url, release_date';

/**
 * Películas del usuario (con seguimiento o en alguna de sus listas) que
 * tienen el género de TheMovieDB indicado, ordenadas por título.
 */
export async function getUserMoviesByGenre(userId: string, genre: string): Promise<MovieCardData[]> {
  const [tracked, listed] = await Promise.all([
    supabase
      .from('user_movies')
      .select(`movies!inner(${MOVIE_CARD_COLUMNS})`)
      .eq('user_id', userId)
      .contains('movies.genre', [genre]),
    // RLS limita el resultado a las listas del usuario con sesión iniciada.
    supabase.from('list_movies').select(`movies!inner(${MOVIE_CARD_COLUMNS})`).contains('movies.genre', [genre]),
  ]);

  if (tracked.error) throw tracked.error;
  if (listed.error) throw listed.error;

  const rows = [...(tracked.data ?? []), ...(listed.data ?? [])] as unknown as { movies: MovieCardData }[];
  const byId = new Map(rows.map((row) => [row.movies.id, row.movies]));
  return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
}

// RLS limita el resultado a las listas del usuario con sesión iniciada.
export async function getListIdsForMovie(movieId: number): Promise<number[]> {
  const { data, error } = await supabase.from('list_movies').select('list_id').eq('movie_id', movieId);

  if (error) throw error;
  return (data ?? []).map((row) => row.list_id);
}

// Ids de las películas de cada lista del usuario (RLS filtra las ajenas).
export async function getListMemberships(): Promise<Map<number, number[]>> {
  const { data, error } = await supabase.from('list_movies').select('list_id, movie_id');

  if (error) throw error;
  const byList = new Map<number, number[]>();
  for (const row of data ?? []) {
    byList.set(row.list_id, [...(byList.get(row.list_id) ?? []), row.movie_id]);
  }
  return byList;
}

export function createList(userId: string, name: string, kind: ListKind) {
  return supabase.from('lists').insert({ user_id: userId, name, kind }).select('id, name, kind').single();
}

export function renameList(listId: number, name: string) {
  return supabase.from('lists').update({ name }).eq('id', listId);
}

export function changeListKind(listId: number, kind: ListKind) {
  return supabase.from('lists').update({ kind }).eq('id', listId);
}

export function deleteList(listId: number) {
  return supabase.from('lists').delete().eq('id', listId);
}

// La posición la asigna la base (queda última en la lista).
export function addMovieToList(listId: number, movieId: number) {
  return supabase.from('list_movies').insert({ list_id: listId, movie_id: movieId });
}

export function removeMovieFromList(listId: number, movieId: number) {
  return supabase.from('list_movies').delete().eq('list_id', listId).eq('movie_id', movieId);
}

export async function setListMoviePositions(listId: number, positions: { movieId: number; position: number }[]) {
  const results = await Promise.all(
    positions.map(({ movieId, position }) =>
      supabase.from('list_movies').update({ position }).eq('list_id', listId).eq('movie_id', movieId)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
