import { supabase } from '@/utils/supabase';

export type Reaction = {
  id: number;
  emoji: string;
  name: string;
};

export const REACTION_NAME_MAX = 20;
export const REACTION_EMOJI_MAX = 16;

// RLS devuelve los calificadores base (user_id null) y los del usuario con
// sesión iniciada; los base van primero.
export async function getReactions(): Promise<Reaction[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('id, emoji, name')
    .order('user_id', { nullsFirst: true })
    .order('id');

  if (error) throw error;
  return data ?? [];
}

export async function getReactionIdsForMovie(userId: string, movieId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('user_movie_reactions')
    .select('reaction_id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .eq('selected', true);

  if (error) throw error;
  return (data ?? []).map((row) => row.reaction_id);
}

export function createReaction(userId: string, emoji: string, name: string) {
  return supabase.from('reactions').insert({ user_id: userId, emoji, name }).select('id, emoji, name').single();
}

// Las marcas pasan por la cola de src/modules/sync. Desmarcar deja la fila con
// selected = false y su hora, para decidir qué cambio es más reciente.

/**
 * Marca o desmarca solo si en el servidor ese calificador no cambió después de
 * changedAt. applied es false si la fila no existe o si su cambio es más nuevo.
 */
export async function updateMovieReactionIfOlder(
  userId: string,
  movieId: number,
  reactionId: number,
  selected: boolean,
  changedAt: string
) {
  const { data, error, status } = await supabase
    .from('user_movie_reactions')
    .update({ selected, changed_at: changedAt })
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .eq('reaction_id', reactionId)
    .lte('changed_at', changedAt)
    .select('reaction_id');
  return { error, status, applied: (data?.length ?? 0) > 0 };
}

export async function movieReactionExists(userId: string, movieId: number, reactionId: number) {
  const { data, error, status } = await supabase
    .from('user_movie_reactions')
    .select('reaction_id')
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .eq('reaction_id', reactionId)
    .maybeSingle();
  return { error, status, exists: data != null };
}

export async function insertMovieReaction(userId: string, movieId: number, reactionId: number, changedAt: string) {
  const { error, status } = await supabase
    .from('user_movie_reactions')
    .insert({ user_id: userId, movie_id: movieId, reaction_id: reactionId, selected: true, changed_at: changedAt });
  return { error, status };
}
