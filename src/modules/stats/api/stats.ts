import {
  countByDay,
  countByMonth,
  pickBusiestMonth,
  pickTopAndBottom,
  sumMinutes,
  type DayCount,
  type MonthCount,
  type TopAndBottom,
  type ViewRecord,
} from '@/modules/stats/utils/metrics';
import { yearPeriod, type StatsPeriod } from '@/modules/stats/utils/period';
import { fetchAllRows } from '@/utils/fetch-all';
import { supabase } from '@/utils/supabase';

type ViewRow = {
  movie_id: number;
  viewed_on: string;
  movies: {
    title: string;
    poster_url: string | null;
    duration_minutes: number | null;
    genre: string[] | null;
    user_movies: { rating: number | string | null }[];
  };
};

const VIEW_COLUMNS =
  'movie_id, viewed_on, movies(title, poster_url, duration_minutes, genre, user_movies(rating))';

function toViewRecord(row: ViewRow): ViewRecord {
  const rating = row.movies.user_movies[0]?.rating;
  return {
    movieId: row.movie_id,
    viewedOn: row.viewed_on,
    title: row.movies.title,
    posterUrl: row.movies.poster_url,
    durationMinutes: row.movies.duration_minutes,
    genres: row.movies.genre ?? [],
    rating: rating == null ? null : Number(rating),
  };
}

// Vistas del período con los datos de cada película. La usan Estadísticas,
// Wrapped y Retos.
export async function getViewRecords(userId: string, period: StatsPeriod): Promise<ViewRecord[]> {
  const rows = await fetchAllRows<ViewRow>((from, to) =>
    supabase
      .from('movie_views')
      .select(VIEW_COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .eq('movies.user_movies.user_id', userId)
      .gte('viewed_on', period.from)
      .lte('viewed_on', period.to)
      .order('id')
      .range(from, to)
  );
  return rows.map(toViewRecord);
}

export async function viewsPerDay(userId: string, period: StatsPeriod): Promise<DayCount[]> {
  return countByDay(await getViewRecords(userId, period));
}

export async function viewsPerMonth(userId: string, year: number): Promise<MonthCount[]> {
  return countByMonth(await getViewRecords(userId, yearPeriod(year)));
}

export async function minutesWatched(userId: string, period: StatsPeriod): Promise<number> {
  return sumMinutes(await getViewRecords(userId, period));
}

export async function topAndBottomRated(userId: string, year: number): Promise<TopAndBottom> {
  return pickTopAndBottom(await getViewRecords(userId, yearPeriod(year)));
}

export async function busiestMonth(userId: string, year: number): Promise<MonthCount | null> {
  return pickBusiestMonth(await getViewRecords(userId, yearPeriod(year)));
}
