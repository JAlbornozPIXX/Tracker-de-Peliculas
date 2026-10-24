import { getListMemberships } from '@/modules/lists/api/lists';
import type { RankedMovie } from '@/modules/ranking/utils/ranking';
import { supabase } from '@/utils/supabase';

type RatedRow = {
  rating: number;
  movies: { id: number; title: string; poster_url: string | null; release_date: string | null; genre: string[] } | null;
};

/**
 * Películas puntuadas por el usuario, con lo necesario para filtrar (listas
 * y calificadores) y desempatar (vista más reciente). Sin ordenar.
 */
export async function getRankedMovies(userId: string): Promise<RankedMovie[]> {
  const [rated, views, reactions, memberships] = await Promise.all([
    supabase
      .from('user_movies')
      .select('rating, movies(id, title, poster_url, release_date, genre)')
      .eq('user_id', userId)
      .not('rating', 'is', null),
    supabase.from('movie_views').select('movie_id, viewed_on').eq('user_id', userId),
    supabase.from('user_movie_reactions').select('movie_id, reaction_id').eq('user_id', userId).eq('selected', true),
    getListMemberships(),
  ]);

  if (rated.error) throw rated.error;
  if (views.error) throw views.error;
  if (reactions.error) throw reactions.error;

  const lastViewed = new Map<number, string>();
  for (const view of views.data ?? []) {
    const current = lastViewed.get(view.movie_id);
    if (!current || view.viewed_on > current) lastViewed.set(view.movie_id, view.viewed_on);
  }

  const reactionIds = new Map<number, number[]>();
  for (const row of reactions.data ?? []) {
    reactionIds.set(row.movie_id, [...(reactionIds.get(row.movie_id) ?? []), row.reaction_id]);
  }

  const listIds = new Map<number, number[]>();
  for (const [listId, movieIds] of memberships) {
    for (const movieId of movieIds) listIds.set(movieId, [...(listIds.get(movieId) ?? []), listId]);
  }

  return ((rated.data ?? []) as unknown as RatedRow[]).flatMap(({ rating, movies: movie }) =>
    movie
      ? [
          {
            id: movie.id,
            title: movie.title,
            posterUrl: movie.poster_url,
            releaseYear: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
            genres: movie.genre ?? [],
            rating: Number(rating),
            lastViewedOn: lastViewed.get(movie.id) ?? null,
            listIds: listIds.get(movie.id) ?? [],
            reactionIds: reactionIds.get(movie.id) ?? [],
          },
        ]
      : []
  );
}
