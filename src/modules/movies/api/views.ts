import { supabase } from '@/utils/supabase';

export type ViewSource = 'manual' | 'auto';

export type ViewEntry = {
  id: number;
  viewedOn: string;
  source: ViewSource;
};

type ViewRow = { id: number; viewed_on: string; source: ViewSource };

const VIEW_COLUMNS = 'id, viewed_on, source';

// Violación de unicidad de Postgres: ya existe la vista automática del día.
const UNIQUE_VIOLATION = '23505';

function toViewEntry(row: ViewRow): ViewEntry {
  return { id: row.id, viewedOn: row.viewed_on, source: row.source };
}

// Más recientes primero.
export function sortViews(views: ViewEntry[]): ViewEntry[] {
  return [...views].sort((a, b) => b.viewedOn.localeCompare(a.viewedOn) || b.id - a.id);
}

export async function getViews(userId: string, movieId: number): Promise<ViewEntry[]> {
  const { data, error } = await supabase
    .from('movie_views')
    .select(VIEW_COLUMNS)
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .order('viewed_on', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toViewEntry);
}

// Siempre inserta: se permiten varias vistas manuales el mismo día.
export async function addView(userId: string, movieId: number, viewedOn: string): Promise<ViewEntry> {
  const { data, error } = await supabase
    .from('movie_views')
    .insert({ user_id: userId, movie_id: movieId, viewed_on: viewedOn, source: 'manual' })
    .select(VIEW_COLUMNS)
    .single();

  if (error) throw error;
  return toViewEntry(data);
}

/**
 * Vista automática al pasar a Terminado. Devuelve null si ya había una
 * automática ese día: el índice único parcial la rechaza. No se usa upsert
 * porque PostgREST no puede apuntar on_conflict a un índice parcial.
 */
export async function addAutoView(userId: string, movieId: number, viewedOn: string): Promise<ViewEntry | null> {
  const { data, error } = await supabase
    .from('movie_views')
    .insert({ user_id: userId, movie_id: movieId, viewed_on: viewedOn, source: 'auto' })
    .select(VIEW_COLUMNS)
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;
    throw error;
  }
  return toViewEntry(data);
}

export function deleteView(viewId: number) {
  return supabase.from('movie_views').delete().eq('id', viewId);
}
