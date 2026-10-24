import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { monthName } from '@/modules/stats/utils/format';
import type { HeatCell, StatsMode } from '@/modules/stats/utils/series';

// Del día sin vistas (0) al día con más vistas del período (4).
const HEAT_COLORS = ['#211D28', '#4A2363', '#6E2C94', '#9A3BCB', '#C770FF'] as const;
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MUTED = '#8F8795';

/**
 * Mapa de calor tipo calendario de GitHub: cada casilla es un día y su tono
 * crece con las vistas. El mes se ve como calendario (una fila por semana);
 * el año como el de GitHub (una columna por semana), con desplazamiento
 * horizontal.
 */
export function ActivityHeatmap({
  weeks,
  mode,
  accessibilityLabel,
}: {
  weeks: HeatCell[][];
  mode: StatsMode;
  accessibilityLabel: string;
}) {
  return (
    <View>
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        {mode === 'month' ? <MonthGrid weeks={weeks} /> : <YearGrid weeks={weeks} />}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Menos</Text>
        {HEAT_COLORS.map((color) => (
          <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendText}>Más</Text>
      </View>
    </View>
  );
}

const MONTH_GAP = 6;
const MONTH_HEADER = 18;

function MonthGrid({ weeks }: { weeks: HeatCell[][] }) {
  const [width, setWidth] = useState(0);
  const cell = Math.min(44, (width - MONTH_GAP * 6) / 7);
  const height = MONTH_HEADER + weeks.length * (cell + MONTH_GAP);
  const left = (width - (cell * 7 + MONTH_GAP * 6)) / 2;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {WEEKDAYS.map((weekday, column) => (
            <SvgText
              key={weekday}
              x={left + column * (cell + MONTH_GAP) + cell / 2}
              y={12}
              fill={MUTED}
              fontSize={11}
              fontWeight="700"
              textAnchor="middle">
              {weekday}
            </SvgText>
          ))}
          {weeks.map((week, row) =>
            week.map((day, column) => {
              if (!day) return null;
              const x = left + column * (cell + MONTH_GAP);
              const y = MONTH_HEADER + row * (cell + MONTH_GAP);
              return (
                <G key={day.day}>
                  <Rect x={x} y={y} width={cell} height={cell} rx={8} fill={HEAT_COLORS[day.level]} />
                  <SvgText
                    x={x + cell / 2}
                    y={y + cell / 2 + 4}
                    fill={day.level >= 3 ? '#FFFFFF' : '#D5D0D8'}
                    fontSize={12}
                    fontWeight="600"
                    textAnchor="middle">
                    {String(Number(day.day.slice(8, 10)))}
                  </SvgText>
                </G>
              );
            })
          )}
        </Svg>
      )}
    </View>
  );
}

const YEAR_CELL = 12;
const YEAR_GAP = 3;
const YEAR_LEFT = 18;
const YEAR_TOP = 16;

function YearGrid({ weeks }: { weeks: HeatCell[][] }) {
  const step = YEAR_CELL + YEAR_GAP;
  const width = YEAR_LEFT + weeks.length * step;
  const height = YEAR_TOP + 7 * step;
  // El nombre del mes va sobre la semana que contiene su día 1.
  const monthLabels = weeks.flatMap((week, column) => {
    const first = week.find((day) => day?.day.endsWith('-01'));
    return first ? [{ column, label: monthName(Number(first.day.slice(5, 7))).slice(0, 3) }] : [];
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={width} height={height}>
        {monthLabels.map(({ column, label }) => (
          <SvgText key={label} x={YEAR_LEFT + column * step} y={11} fill={MUTED} fontSize={10}>
            {label}
          </SvgText>
        ))}
        {/* Como en GitHub, solo algunos días de la semana llevan nombre. */}
        {[0, 2, 4].map((row) => (
          <SvgText key={row} x={0} y={YEAR_TOP + row * step + YEAR_CELL - 2} fill={MUTED} fontSize={9}>
            {WEEKDAYS[row]}
          </SvgText>
        ))}
        {weeks.map((week, column) =>
          week.map((day, row) =>
            day ? (
              <Rect
                key={day.day}
                x={YEAR_LEFT + column * step}
                y={YEAR_TOP + row * step}
                width={YEAR_CELL}
                height={YEAR_CELL}
                rx={3}
                fill={HEAT_COLORS[day.level]}
              />
            ) : null
          )
        )}
      </Svg>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 10 },
  legendText: { color: MUTED, fontSize: 11, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
});
