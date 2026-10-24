import type { Challenge, ChallengeFilter, ChallengeView } from '@/modules/challenges/utils/challenges';
import { supabase } from '@/utils/supabase';

type ChallengeRow = {
  id: number;
  title: string;
  target_count: number;
  filter: ChallengeFilter | null;
  starts_on: string;
  ends_on: string;
};

const CHALLENGE_COLUMNS = 'id, title, target_count, filter, starts_on, ends_on';

function toChallenge(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    title: row.title,
    targetCount: row.target_count,
    filter: row.filter ?? {},
    startsOn: row.starts_on,
    endsOn: row.ends_on,
  };
}

export async function getChallenges(userId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select(CHALLENGE_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toChallenge);
}

export async function createChallenge(userId: string, challenge: Omit<Challenge, 'id'>): Promise<Challenge> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      user_id: userId,
      title: challenge.title,
      target_count: challenge.targetCount,
      filter: challenge.filter,
      starts_on: challenge.startsOn,
      ends_on: challenge.endsOn,
    })
    .select(CHALLENGE_COLUMNS)
    .single();

  if (error) throw error;
  return toChallenge(data);
}

export function extendChallenge(challengeId: number, endsOn: string) {
  return supabase.from('challenges').update({ ends_on: endsOn }).eq('id', challengeId);
}

export function deleteChallenge(challengeId: number) {
  return supabase.from('challenges').delete().eq('id', challengeId);
}

// Vistas del usuario entre dos días (inclusive) con los géneros de cada película.
export async function getViewsBetween(userId: string, from: string, to: string): Promise<ChallengeView[]> {
  const { data, error } = await supabase
    .from('movie_views')
    .select('movie_id, viewed_on, movies(genre)')
    .eq('user_id', userId)
    .gte('viewed_on', from)
    .lte('viewed_on', to);

  if (error) throw error;
  const rows = (data ?? []) as unknown as { movie_id: number; viewed_on: string; movies: { genre: string[] } | null }[];
  return rows.map((row) => ({ movieId: row.movie_id, viewedOn: row.viewed_on, genres: row.movies?.genre ?? [] }));
}
