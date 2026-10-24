// Cálculos sobre vistas ya leídas de la base, los usa src/modules/stats/api/stats.ts y se prueban sin Supabase

export type ViewRecord = {
  movieId: number;
  viewedOn: string;
  title: string;
  posterUrl: string | null;
  durationMinutes: number | null;
  genres: string[];
  rating: number | null;
};

export type DayCount = { date: string; views: number };

export type MonthCount = { month: number; views: number };

export type RatedMovie = {
  movieId: number;
  title: string;
  posterUrl: string | null;
  rating: number;
  lastViewedOn: string;
};

export type TopAndBottom = {
  top: RatedMovie | null;
  bottom: RatedMovie | null;
};

//Sólo los días con vistas de más antiguo a más reciente
export function countByDay(records: ViewRecord[]): DayCount[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    counts.set(record.viewedOn, (counts.get(record.viewedOn) ?? 0) + 1);
  }
  return Array.from(counts, ([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date));
}

//Sólo los meses con vistas de enero a diciembre
export function countByMonth(records: ViewRecord[]): MonthCount[] {
  const counts = new Map<number, number>();
  for (const record of records) {
    const month = Number(record.viewedOn.slice(5, 7));
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return Array.from(counts, ([month, views]) => ({ month, views })).sort((a, b) => a.month - b.month);
}

//Cada vista suma la duración del título y una serie suma la de un episodio
//Un título sin duración en TheMovieDB suma 0 minutos, pero su vista sigue contando en los demás totales
export function sumMinutes(records: ViewRecord[]): number {
  return records.reduce((total, record) => total + (record.durationMinutes ?? 0), 0);
}

// Mejor y peor puntuada entre los títulos vistos, las vistas sin nota no participan, en empate gana la vista más reciente y luego el id menor. bottom nunca repite a top y con un solo título puntuado es null
export function pickTopAndBottom(records: ViewRecord[]): TopAndBottom {
  const movies = new Map<number, RatedMovie>();
  for (const record of records) {
    if (record.rating == null) continue;
    const current = movies.get(record.movieId);
    if (current && current.lastViewedOn >= record.viewedOn) continue;
    movies.set(record.movieId, {
      movieId: record.movieId,
      title: record.title,
      posterUrl: record.posterUrl,
      rating: record.rating,
      lastViewedOn: record.viewedOn,
    });
  }

  const rated = Array.from(movies.values());
  const byRecency = (a: RatedMovie, b: RatedMovie) =>
    b.lastViewedOn.localeCompare(a.lastViewedOn) || a.movieId - b.movieId;
  const top = [...rated].sort((a, b) => b.rating - a.rating || byRecency(a, b))[0] ?? null;
  const bottom =
    rated.filter((movie) => movie !== top).sort((a, b) => a.rating - b.rating || byRecency(a, b))[0] ?? null;
  return { top, bottom };
}

//En empate gana el primer mes
export function pickBusiestMonth(records: ViewRecord[]): MonthCount | null {
  let busiest: MonthCount | null = null;
  for (const entry of countByMonth(records)) {
    if (!busiest || entry.views > busiest.views) busiest = entry;
  }
  return busiest;
}
