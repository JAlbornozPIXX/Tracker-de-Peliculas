import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Aviso para una sección o búsqueda sin resultados, con una acción opcional
 * para salir de ahí (p. ej. "Cambiar filtro"). Nunca dejar la pantalla en blanco.
 */
export function EmptyNotice({
  title,
  copy,
  actionLabel,
  onAction,
}: {
  title: string;
  copy?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      {copy && <Text style={styles.copy}>{copy}</Text>}
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18, gap: 6 },
  title: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  copy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
  button: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#A83BDD' },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
