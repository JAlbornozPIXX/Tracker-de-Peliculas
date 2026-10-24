import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { formatViewDate, fromDateString, toLocalDateString } from '@/modules/movies/utils/view-date';

const ACCENT = '#B94DFF';

/**
 * Selector de un día ('YYYY-MM-DD') sin fechas posteriores a max. En iOS es
 * el selector compacto en línea; en Android abre el diálogo nativo al tocar.
 * En web DateTimePicker no renderiza nada: ver date-field.web.tsx.
 */
export function DateField({
  value,
  max,
  onChange,
  label = 'Fecha de la vista',
}: {
  value: string;
  max: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const [androidOpen, setAndroidOpen] = useState(false);

  if (Platform.OS === 'android') {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatViewDate(value)}`}
          onPress={() => setAndroidOpen(true)}
          style={styles.field}>
          <Text style={styles.fieldText}>{formatViewDate(value)}</Text>
        </Pressable>
        {androidOpen && (
          <DateTimePicker
            value={fromDateString(value)}
            maximumDate={fromDateString(max)}
            accentColor={ACCENT}
            positiveButton={{ label: 'Aceptar' }}
            negativeButton={{ label: 'Cancelar' }}
            onValueChange={(_event, date) => {
              setAndroidOpen(false);
              // El selector de Android devuelve la medianoche UTC del día elegido.
              onChange(date.toISOString().slice(0, 10));
            }}
            onDismiss={() => setAndroidOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <DateTimePicker
      value={fromDateString(value)}
      maximumDate={fromDateString(max)}
      display="compact"
      locale="es_CL"
      themeVariant="dark"
      accentColor={ACCENT}
      onValueChange={(_event, date) => onChange(toLocalDateString(date))}
      style={styles.iosPicker}
    />
  );
}

const styles = StyleSheet.create({
  field: { height: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', justifyContent: 'center' },
  fieldText: { color: '#F4F4F5', fontSize: 14, fontWeight: '600' },
  iosPicker: { alignSelf: 'flex-start' },
});
