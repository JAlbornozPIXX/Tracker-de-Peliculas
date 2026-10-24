import { Circle, Rect } from 'react-native-svg';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ActivityHeatmap } from '../activity-heatmap';
import { ActivityLineChart } from '../activity-line-chart';
import type { ViewRecord } from '@/modules/stats/utils/metrics';
import { monthPeriod, yearPeriod } from '@/modules/stats/utils/period';
import { activitySeries, heatmapWeeks, viewsByDay } from '@/modules/stats/utils/series';

function view(movieId: number, viewedOn: string): ViewRecord {
  return { movieId, viewedOn, title: `Película ${movieId}`, posterUrl: null, durationMinutes: 90, genres: [], rating: null };
}

const RECORDS = [view(1, '2026-10-01'), view(2, '2026-10-01'), view(3, '2026-10-05'), view(4, '2026-03-12')];

// En las pruebas no hay layout: se avisa un ancho como lo haría el teléfono.
function layout(renderer: ReactTestRenderer, width: number) {
  act(() => {
    renderer.root
      .findAll((node) => typeof node.props.onLayout === 'function')
      .forEach((node) => node.props.onLayout({ nativeEvent: { layout: { width, height: 0, x: 0, y: 0 } } }));
  });
}

describe('gráficos de Estadísticas', () => {
  it('el gráfico de líneas dibuja un punto por día con vistas', () => {
    let renderer!: ReactTestRenderer;
    const points = activitySeries({ mode: 'month', year: 2026, month: 10 }, RECORDS);
    act(() => {
      renderer = create(<ActivityLineChart points={points} accessibilityLabel="Actividad de octubre" />);
    });
    layout(renderer, 340);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Actividad de octubre' })).toBeTruthy();
    // 2 días con vistas: el 1 y el 5.
    expect(renderer.root.findAllByType(Circle)).toHaveLength(2);
  });

  it('el mapa del mes tiene una casilla por día y la leyenda menos → más', () => {
    let renderer!: ReactTestRenderer;
    const weeks = heatmapWeeks(monthPeriod(2026, 10), viewsByDay(RECORDS));
    act(() => {
      renderer = create(<ActivityHeatmap mode="month" weeks={weeks} accessibilityLabel="Mapa de octubre" />);
    });
    layout(renderer, 340);
    const cells = renderer.root.findAllByType(Rect);
    expect(cells).toHaveLength(31);
    // El 1 de octubre (2 vistas) es el día con más vistas: el tono más fuerte de los usados.
    expect(new Set(cells.map((cell) => cell.props.fill)).size).toBe(3);
    // Al menos 4 tonos más el vacío en la leyenda.
    const legend = renderer.root.findAll((node) => node.props.style?.[1]?.backgroundColor != null);
    expect(new Set(legend.map((node) => node.props.style[1].backgroundColor)).size).toBeGreaterThanOrEqual(5);
    const texts = renderer.root.findAll((node) => typeof node.props.children === 'string').map((node) => node.props.children);
    expect(texts).toEqual(expect.arrayContaining(['Menos', 'Más']));
  });

  it('el mapa del año tiene una casilla por día del año', () => {
    let renderer!: ReactTestRenderer;
    const weeks = heatmapWeeks(yearPeriod(2026), viewsByDay(RECORDS));
    act(() => {
      renderer = create(<ActivityHeatmap mode="year" weeks={weeks} accessibilityLabel="Mapa de 2026" />);
    });
    expect(renderer.root.findAllByType(Rect)).toHaveLength(365);
  });
});
