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
    .eq('movie_id', movieId);

  if (error) throw error;
  return (data ?? []).map((row) => row.reaction_id);
}

export function createReaction(userId: string, emoji: string, name: string) {
  return supabase.from('reactions').insert({ user_id: userId, emoji, name }).select('id, emoji, name').single();
}

export function addReactionToMovie(userId: string, movieId: number, reactionId: number) {
  return supabase.from('user_movie_reactions').insert({ user_id: userId, movie_id: movieId, reaction_id: reactionId });
}

export function removeReactionFromMovie(userId: string, movieId: number, reactionId: number) {
  return supabase
    .from('user_movie_reactions')
    .delete()
    .eq('user_id', userId)
    .eq('movie_id', movieId)
    .eq('reaction_id', reactionId);
}
