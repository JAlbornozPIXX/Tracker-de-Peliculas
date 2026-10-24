import { supabase } from '@/utils/supabase';

export type ViewSource = 'manual' | 'auto';

// pending: vista automática guardada solo en el teléfono (Terminada sin red);
// tiene un id negativo provisorio y todavía no se puede borrar.
export type ViewEntry = {
  id: number;
  viewedOn: string;
  source: ViewSource;
  pending?: boolean;
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
 * Vista automática al pasar a Terminado; la sube la cola de src/modules/sync,
 * así funciona también sin red. Si ese día ya hay una vista (manual o
 * automática) no suma otra. Una automática repetida la rechaza el índice
 * único parcial y cuenta como guardada. No se usa upsert porque PostgREST no
 * puede apuntar on_conflict a un índice parcial.
 */
export async function addAutoViewIfNone(userId: string, movieId: number, viewedOn: string) {
  const existing = await supabase
    .from('movie_views')
    .select('id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .eq('viewed_on', viewedOn)
    .limit(1);
  if (existing.error || (existing.data ?? []).length > 0) return { status: existing.status, error: existing.error };

  const { error, status } = await supabase
    .from('movie_views')
    .insert({ user_id: userId, movie_id: movieId, viewed_on: viewedOn, source: 'auto' });
  return error?.code === UNIQUE_VIOLATION ? { status, error: null } : { status, error };
}

export function deleteView(viewId: number) {
  return supabase.from('movie_views').delete().eq('id', viewId);
}
