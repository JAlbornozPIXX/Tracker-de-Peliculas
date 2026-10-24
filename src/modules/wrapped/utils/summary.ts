import {
  pickBusiestMonth,
  pickTopAndBottom,
  sumMinutes,
  type MonthCount,
  type RatedMovie,
  type ViewRecord,
} from '@/modules/stats/utils/metrics';

//Con menos vistas en el año se muestra un resumen parcial en vez de la tarjeta
export const WRAPPED_MIN_VIEWS = 5;

export type WrappedSummary = {
  year: number;
  views: number;
  titles: number;
  minutes: number;
  busiestMonth: MonthCount | null;
  top: RatedMovie | null;
  bottom: RatedMovie | null;
};

//Records son las vistas de un solo año
export function summarizeYear(year: number, records: ViewRecord[]): WrappedSummary {
  const { top, bottom } = pickTopAndBottom(records);
  return {
    year,
    views: records.length,
    titles: new Set(records.map((record) => record.movieId)).size,
    minutes: sumMinutes(records),
    busiestMonth: pickBusiestMonth(records),
    top,
    bottom,
  };
}

export function isWrappedReady(summary: WrappedSummary): boolean {
  return summary.views >= WRAPPED_MIN_VIEWS;
}
