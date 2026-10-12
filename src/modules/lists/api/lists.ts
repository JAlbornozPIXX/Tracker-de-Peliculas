import { supabase } from '@/utils/supabase';

export type ListSummary = {
  id: number;
  name: string;
  movieCount: number;
};

export type ListMovie = {
  id: number;
  title: string;
  poster_url: string | null;
  release_date: string | null;
  tmdb_id: number | null;
  media_type: 'movie' | 'tv' | null;
};

export type ListWithMovies = {
  id: number;
  name: string;
  movies: ListMovie[];
};

export const LIST_NAME_MAX = 60;

export async function getLists(userId: string): Promise<ListSummary[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('id, name, list_movies(count)')
    .eq('user_id', userId)
    .order('created_at');

  if (error) throw error;

  const rows = (data ?? []) as unknown as { id: number; name: string; list_movies: { count: number }[] }[];
  return rows.map((row) => ({ id: row.id, name: row.name, movieCount: row.list_movies[0]?.count ?? 0 }));
}

const LIST_WITH_MOVIES_COLUMNS =
  'id, name, list_movies(added_at, movies(id, title, poster_url, release_date, tmdb_id, media_type))';

type ListWithMoviesRow = { id: number; name: string; list_movies: { movies: ListMovie | null }[] };

function toListWithMovies(row: ListWithMoviesRow): ListWithMovies {
  return {
    id: row.id,
    name: row.name,
    movies: row.list_movies.flatMap((item) => (item.movies ? [item.movies] : [])),
  };
}

export async function getListWithMovies(listId: number): Promise<ListWithMovies | null> {
  const { data, error } = await supabase
    .from('lists')
    .select(LIST_WITH_MOVIES_COLUMNS)
    .eq('id', listId)
    .order('added_at', { referencedTable: 'list_movies', ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data ? toListWithMovies(data as unknown as ListWithMoviesRow) : null;
}

export async function getListsWithMovies(userId: string): Promise<ListWithMovies[]> {
  const { data, error } = await supabase
    .from('lists')
    .select(LIST_WITH_MOVIES_COLUMNS)
    .eq('user_id', userId)
    .order('created_at')
    .order('added_at', { referencedTable: 'list_movies', ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ListWithMoviesRow[]).map(toListWithMovies);
}

// RLS limita el resultado a las listas del usuario con sesión iniciada.
export async function getListIdsForMovie(movieId: number): Promise<number[]> {
  const { data, error } = await supabase.from('list_movies').select('list_id').eq('movie_id', movieId);

  if (error) throw error;
  return (data ?? []).map((row) => row.list_id);
}

export function createList(userId: string, name: string) {
  return supabase.from('lists').insert({ user_id: userId, name }).select('id, name').single();
}

export function renameList(listId: number, name: string) {
  return supabase.from('lists').update({ name }).eq('id', listId);
}

export function deleteList(listId: number) {
  return supabase.from('lists').delete().eq('id', listId);
}

export function addMovieToList(listId: number, movieId: number) {
  return supabase.from('list_movies').insert({ list_id: listId, movie_id: movieId });
}

export function removeMovieFromList(listId: number, movieId: number) {
  return supabase.from('list_movies').delete().eq('list_id', listId).eq('movie_id', movieId);
}
