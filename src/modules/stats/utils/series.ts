// Datos que dibujan los gráficos de Estadísticas (D2): series con ceros donde
// no hubo vistas, niveles del mapa de calor y la cuadrícula del calendario.
// Funciones puras sobre las vistas que ya leyó D1.

import { fromDateString, toLocalDateString } from '@/modules/movies/utils/view-date';
import { monthName } from '@/modules/stats/utils/format';
import { sumMinutes, type ViewRecord } from '@/modules/stats/utils/metrics';
import { monthPeriod, yearPeriod, type StatsPeriod } from '@/modules/stats/utils/period';

export type StatsMode = 'month' | 'year';

// month va de 1 a 12; en el modo año se conserva para volver al mismo mes.
export type StatsSelection = { mode: StatsMode; year: number; month: number };

export function selectionAt(date: Date, mode: StatsMode): StatsSelection {
  return { mode, year: date.getFullYear(), month: date.getMonth() + 1 };
}

// Período que contiene el día 'YYYY-MM-DD', en el modo indicado.
export function selectionForDay(day: string, mode: StatsMode): StatsSelection {
  return selectionAt(fromDateString(day), mode);
}

export function selectionPeriod(selection: StatsSelection): StatsPeriod {
  return selection.mode === 'month' ? monthPeriod(selection.year, selection.month) : yearPeriod(selection.year);
}

export function selectionLabel(selection: StatsSelection): string {
  return selection.mode === 'month' ? `${monthName(selection.month)} ${selection.year}` : String(selection.year);
}

// delta en meses o en años, según el modo.
export function shiftSelection(selection: StatsSelection, delta: number): StatsSelection {
  if (selection.mode === 'year') return { ...selection, year: selection.year + delta };
  const index = selection.year * 12 + (selection.month - 1) + delta;
  return { ...selection, year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// true si el período siguiente todavía no empieza (no hay vistas futuras).
export function isLatestSelection(selection: StatsSelection, today: Date): boolean {
  const current = selectionAt(today, selection.mode);
  if (selection.year !== current.year) return selection.year > current.year;
  return selection.mode === 'year' || selection.month >= current.month;
}

export type PeriodSummary = { views: number; titles: number; minutes: number };

export function summarizePeriod(records: ViewRecord[]): PeriodSummary {
  return {
    views: records.length,
    titles: new Set(records.map((record) => record.movieId)).size,
    minutes: sumMinutes(records),
  };
}

export function viewsByDay(records: ViewRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.viewedOn, (counts.get(record.viewedOn) ?? 0) + 1);
  return counts;
}

// tick: el eje muestra la etiqueta de ese punto (algunos días en el mes, todos los meses en el año).
export type SeriesPoint = { label: string; views: number; tick: boolean };

/** Gráfico de líneas: un punto por día (vista mes) o por mes (vista año), con 0 donde no hubo vistas. */
export function activitySeries(selection: StatsSelection, records: ViewRecord[]): SeriesPoint[] {
  if (selection.mode === 'year') {
    const counts = Array.from({ length: 12 }, () => 0);
    for (const record of records) counts[Number(record.viewedOn.slice(5, 7)) - 1] += 1;
    return counts.map((views, index) => ({ label: monthName(index + 1).charAt(0), views, tick: true }));
  }

  const byDay = viewsByDay(records);
  return daysOf(selectionPeriod(selection)).map((day) => {
    const dayOfMonth = Number(day.slice(8, 10));
    return { label: String(dayOfMonth), views: byDay.get(day) ?? 0, tick: (dayOfMonth - 1) % 7 === 0 };
  });
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Tono del mapa de calor: 0 sin vistas y de 1 a 4 según cuánto se acerca al
 * día con más vistas del período. Si ningún día pasa de 4 vistas, cada vista
 * sube un tono.
 */
export function heatLevel(views: number, maxViews: number): HeatLevel {
  if (views <= 0) return 0;
  const level = maxViews <= 4 ? views : Math.ceil((views / maxViews) * 4);
  return Math.min(4, Math.max(1, level)) as HeatLevel;
}

// null: casilla fuera del período (relleno para que las semanas empiecen el lunes).
export type HeatCell = { day: string; views: number; level: HeatLevel } | null;

/**
 * Semanas del período, de lunes a domingo, como en un calendario. El mes se
 * dibuja con una fila por semana y el año como el de GitHub, con una columna
 * por semana.
 */
export function heatmapWeeks(period: StatsPeriod, byDay: Map<string, number>): HeatCell[][] {
  const days = daysOf(period);
  const maxViews = Math.max(0, ...days.map((day) => byDay.get(day) ?? 0));
  const cells: HeatCell[] = Array.from({ length: weekdayIndex(days[0]) }, () => null);
  for (const day of days) {
    const views = byDay.get(day) ?? 0;
    cells.push({ day, views, level: heatLevel(views, maxViews) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: HeatCell[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}

// Lunes = 0 ... domingo = 6.
export function weekdayIndex(day: string): number {
  return (fromDateString(day).getDay() + 6) % 7;
}

function daysOf(period: StatsPeriod): string[] {
  const days: string[] = [];
  for (let date = fromDateString(period.from); toLocalDateString(date) <= period.to; date.setDate(date.getDate() + 1)) {
    days.push(toLocalDateString(date));
  }
  return days;
}
