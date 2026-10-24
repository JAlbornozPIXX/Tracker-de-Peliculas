import { StyleSheet, Text, View } from 'react-native';

import { progressRatio } from '@/utils/progress';

const ACCENT = '#B94DFF';
const DONE_COLOR = '#4ADE80';

/**
 * Barra de avance "label · done de total". Con total 0 muestra "0 de 0" y la
 * barra vacía. done puede superar a total (p. ej. un reto sobrecumplido): el
 * texto muestra el número real y la barra queda llena.
 */
export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const ratio = progressRatio(done, total);
  const complete = total > 0 && done >= total;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: Math.min(done, total), text: `${done} de ${total}` }}
      style={styles.wrap}>
      <View style={styles.textRow}>
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        <Text style={[styles.count, complete && styles.countDone]}>
          {done} de {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }, complete && styles.fillDone]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  textRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  count: { color: '#D78CFF', fontSize: 13, fontWeight: '800' },
  countDone: { color: DONE_COLOR },
  track: { height: 8, borderRadius: 4, backgroundColor: '#292431', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: ACCENT },
  fillDone: { backgroundColor: DONE_COLOR },
});
