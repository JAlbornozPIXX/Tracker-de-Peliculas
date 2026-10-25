import { useCallback } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { ratingFromPress } from '@/modules/movies/utils/star-rating';

const STAR_COUNT = 5;
const STAR_SIZE = 36;
const GOLD = '#FFD700';

function Star({ fillFraction, gold }: { fillFraction: number; gold: boolean }) {
  const clamped = Math.max(0, Math.min(1, fillFraction));
  return (
    <View style={{ width: STAR_SIZE, height: STAR_SIZE }}>
      <Text style={[styles.starGlyph, styles.starOutline]}>☆</Text>
      <View style={[styles.starFilledClip, { width: STAR_SIZE * clamped }]}>
        <Text style={[styles.starGlyph, { color: gold ? GOLD : '#D78CFF' }]}>★</Text>
      </View>
    </View>
  );
}

export function StarRatingInput({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  const handlePress = useCallback(
    (starIndex: number, event: GestureResponderEvent) => {
      onChange(ratingFromPress(starIndex, event.nativeEvent.locationX, STAR_SIZE));
    },
    [onChange]
  );

  const isPerfect = value === 5;

  return (
    <View style={[styles.frame, isPerfect && styles.goldFrame]}>
      <View style={styles.row}>
        {Array.from({ length: STAR_COUNT }).map((_, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Calificar ${index + 1} de 5 estrellas`}
            onPress={(event) => handlePress(index, event)}
            style={styles.starSlot}>
            <Star fillFraction={value == null ? 0 : value - index} gold={isPerfect} />
          </Pressable>
        ))}
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.valueLabel}>{value != null ? `${value.toFixed(2)} / 5.00` : 'Sin calificación'}</Text>
        {value != null && (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)}>
            <Text style={styles.clearLabel}>Quitar calificación</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#27222D', backgroundColor: '#15131A' },
  // El borde más grueso se descuenta del padding: llegar a 5 estrellas no cambia el tamaño.
  goldFrame: { borderColor: GOLD, borderWidth: 2, padding: 11, backgroundColor: 'rgba(255,215,0,0.08)' },
  row: { flexDirection: 'row', gap: 6 },
  starSlot: { width: STAR_SIZE, height: STAR_SIZE },
  starGlyph: { fontSize: STAR_SIZE - 4, lineHeight: STAR_SIZE, position: 'absolute', left: 0, top: 0 },
  starOutline: { color: '#47414D' },
  starFilledClip: { position: 'absolute', left: 0, top: 0, height: STAR_SIZE, overflow: 'hidden' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  valueLabel: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  clearLabel: { color: '#F87171', fontSize: 12, fontWeight: '700' },
});
