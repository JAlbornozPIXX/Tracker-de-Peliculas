import type { ViewRecord } from '../metrics';
import { monthPeriod, yearPeriod } from '../period';
import {
  activitySeries,
  heatLevel,
  heatmapWeeks,
  isLatestSelection,
  selectionForDay,
  selectionLabel,
  selectionPeriod,
  shiftSelection,
  summarizePeriod,
  viewsByDay,
  weekdayIndex,
  type StatsSelection,
} from '../series';

function view(movieId: number, viewedOn: string, durationMinutes: number | null = 100): ViewRecord {
  return { movieId, viewedOn, title: `Película ${movieId}`, posterUrl: null, durationMinutes, genres: [], rating: null };
}

const OCTOBER: StatsSelection = { mode: 'month', year: 2026, month: 10 };
const YEAR: StatsSelection = { mode: 'year', year: 2026, month: 10 };

describe('períodos', () => {
  it('el mes y el año elegidos son los de D1', () => {
    expect(selectionPeriod(OCTOBER)).toEqual(monthPeriod(2026, 10));
    expect(selectionPeriod(YEAR)).toEqual(yearPeriod(2026));
  });

  it('las flechas cambian de mes (pasando de año) o de año', () => {
    expect(shiftSelection({ mode: 'month', year: 2026, month: 1 }, -1)).toMatchObject({ year: 2025, month: 12 });
    expect(shiftSelection({ mode: 'month', year: 2025, month: 12 }, 1)).toMatchObject({ year: 2026, month: 1 });
    expect(shiftSelection(YEAR, -1)).toEqual({ mode: 'year', year: 2025, month: 10 });
  });

  it('no deja pasar al período siguiente al actual', () => {
    const today = new Date(2026, 9, 24);
    expect(isLatestSelection(OCTOBER, today)).toBe(true);
    expect(isLatestSelection({ mode: 'month', year: 2026, month: 9 }, today)).toBe(false);
    expect(isLatestSelection({ mode: 'month', year: 2025, month: 12 }, today)).toBe(false);
    expect(isLatestSelection(YEAR, today)).toBe(true);
    expect(isLatestSelection({ mode: 'year', year: 2025, month: 10 }, today)).toBe(false);
  });

  it('"Cambiar período" salta al mes o al año de la última vista', () => {
    expect(selectionForDay('2026-03-15', 'month')).toEqual({ mode: 'month', year: 2026, month: 3 });
    expect(selectionForDay('2025-12-31', 'year')).toMatchObject({ mode: 'year', year: 2025 });
  });

  it('nombra el período', () => {
    expect(selectionLabel(OCTOBER)).toBe('Octubre 2026');
    expect(selectionLabel(YEAR)).toBe('2026');
  });
});

describe('resumen del período', () => {
  it('cuenta vistas, títulos distintos y minutos', () => {
    const records = [view(1, '2026-10-01', 120), view(1, '2026-10-05', 120), view(2, '2026-10-05', null)];
    expect(summarizePeriod(records)).toEqual({ views: 3, titles: 2, minutes: 240 });
  });
});

describe('gráfico de líneas', () => {
  const records = [view(1, '2026-10-01'), view(2, '2026-10-01'), view(3, '2026-10-31'), view(4, '2026-02-10')];

  it('en el mes hay un punto por día, con 0 donde no hubo vistas', () => {
    const points = activitySeries(OCTOBER, records.slice(0, 3));
    expect(points).toHaveLength(31);
    expect(points[0]).toEqual({ label: '1', views: 2, tick: true });
    expect(points[1].views).toBe(0);
    expect(points[30]).toMatchObject({ label: '31', views: 1 });
    expect(points.filter((point) => point.tick).map((point) => point.label)).toEqual(['1', '8', '15', '22', '29']);
  });

  it('en el año hay un punto por mes', () => {
    const points = activitySeries(YEAR, records);
    expect(points.map((point) => point.views)).toEqual([0, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0]);
    expect(points.map((point) => point.label).join('')).toBe('EFMAMJJASOND');
  });

  it('febrero bisiesto tiene 29 puntos', () => {
    expect(activitySeries({ mode: 'month', year: 2024, month: 2 }, [])).toHaveLength(29);
  });
});

describe('mapa de calor', () => {
  it('usa 4 tonos además del vacío', () => {
    expect([0, 1, 2, 3, 4, 9].map((views) => heatLevel(views, 4))).toEqual([0, 1, 2, 3, 4, 4]);
    expect([1, 3, 5, 6, 10].map((views) => heatLevel(views, 10))).toEqual([1, 2, 2, 3, 4]);
    // Una sola vista en un día de mucha actividad igual se nota.
    expect(heatLevel(1, 100)).toBe(1);
  });

  it('el mes empieza el lunes: octubre de 2026 empieza en jueves', () => {
    expect(weekdayIndex('2026-10-01')).toBe(3);
    const weeks = heatmapWeeks(monthPeriod(2026, 10), viewsByDay([view(1, '2026-10-01'), view(2, '2026-10-01')]));
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]).toEqual({ day: '2026-10-01', views: 2, level: 2 });
    expect(weeks.flat().filter((cell) => cell != null)).toHaveLength(31);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('el año tiene una columna por semana, como el de GitHub', () => {
    const weeks = heatmapWeeks(yearPeriod(2026), new Map());
    expect(weeks.length).toBeGreaterThanOrEqual(53);
    expect(weeks.flat().filter((cell) => cell != null)).toHaveLength(365);
    expect(weeks.flat().every((cell) => cell == null || cell.level === 0)).toBe(true);
  });
});
