import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { SeriesPoint } from '@/modules/stats/utils/series';

const HEIGHT = 170;
const TOP = 14;
const BOTTOM = 24;
const LEFT = 26;
const RIGHT = 10;
const ACCENT = '#C770FF';
const MUTED = '#8F8795';

/**
 * Gráfico de líneas de vistas por día (mes) o por mes (año). Se adapta al
 * ancho del contenedor; el eje vertical va de 0 al máximo del período.
 */
export function ActivityLineChart({ points, accessibilityLabel }: { points: SeriesPoint[]; accessibilityLabel: string }) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...points.map((point) => point.views));
  const innerWidth = Math.max(0, width - LEFT - RIGHT);
  const baseline = HEIGHT - BOTTOM;
  const x = (index: number) => LEFT + (points.length > 1 ? (index / (points.length - 1)) * innerWidth : innerWidth / 2);
  const y = (views: number) => baseline - (views / max) * (baseline - TOP);
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.views)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${baseline} L${x(0)},${baseline} Z`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.container}>
      {width > 0 && points.length > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Line x1={LEFT} x2={width - RIGHT} y1={TOP} y2={TOP} stroke="#27222D" strokeDasharray="3 4" />
          <Line x1={LEFT} x2={width - RIGHT} y1={baseline} y2={baseline} stroke="#3A3342" />
          <SvgText x={LEFT - 6} y={TOP + 4} fill={MUTED} fontSize={10} textAnchor="end">
            {String(max)}
          </SvgText>
          <SvgText x={LEFT - 6} y={baseline + 4} fill={MUTED} fontSize={10} textAnchor="end">
            0
          </SvgText>
          <Path d={area} fill={ACCENT} fillOpacity={0.14} />
          <Path d={line} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point, index) =>
            point.views > 0 ? <Circle key={`punto-${index}`} cx={x(index)} cy={y(point.views)} r={3} fill={ACCENT} /> : null
          )}
          {points.map((point, index) =>
            point.tick ? (
              <SvgText key={`eje-${index}`} x={x(index)} y={HEIGHT - 6} fill={MUTED} fontSize={10} textAnchor="middle">
                {point.label}
              </SvgText>
            ) : null
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: HEIGHT },
});
