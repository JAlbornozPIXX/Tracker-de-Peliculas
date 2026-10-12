import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STATUS_OPTIONS, StatusKey } from '@/modules/movies/constants/status';

export function StatusPicker({ value, onChange }: { value: StatusKey | null; onChange: (next: StatusKey) => void }) {
  return (
    <View style={styles.wrap}>
      {STATUS_OPTIONS.map((option) => {
        const active = value === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  chipActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  chipText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#F4F4F5', fontWeight: '800' },
});
