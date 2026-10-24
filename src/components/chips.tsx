import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type ChipOption<K> = { key: K; label: string };

/**
 * Fila de chips de selección única. Con scroll la fila se desliza en
 * horizontal; sin él los chips pasan a la línea siguiente.
 */
export function Chips<K extends string | number | null>({
  options,
  value,
  onChange,
  scroll = false,
}: {
  options: readonly ChipOption<K>[];
  value: K;
  onChange: (next: K) => void;
  scroll?: boolean;
}) {
  const chips = options.map((option) => {
    const selected = option.key === value;
    return (
      <Pressable
        key={String(option.key)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={option.label}
        onPress={() => onChange(option.key)}
        style={[styles.chip, selected && styles.chipActive]}>
        <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        accessibilityRole="radiogroup"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" style={styles.wrap}>
      {chips}
    </View>
  );
}

/**
 * Fila de chips de selección múltiple que se desliza en horizontal. Con max
 * los chips no elegidos se deshabilitan al llegar al tope.
 */
export function ToggleChips<K extends string | number>({
  options,
  values,
  onChange,
  max,
}: {
  options: readonly ChipOption<K>[];
  values: readonly K[];
  onChange: (next: K[]) => void;
  max?: number;
}) {
  const full = max != null && values.length >= max;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = values.includes(option.key);
        const disabled = full && !selected;
        return (
          <Pressable
            key={String(option.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled }}
            accessibilityLabel={option.label}
            disabled={disabled}
            onPress={() => onChange(selected ? values.filter((v) => v !== option.key) : [...values, option.key])}
            style={[styles.chip, selected && styles.chipActive, disabled && styles.chipDisabled]}>
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipDisabled: { opacity: 0.4 },
  row: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  chipActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  chipText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#F4F4F5', fontWeight: '800' },
});
