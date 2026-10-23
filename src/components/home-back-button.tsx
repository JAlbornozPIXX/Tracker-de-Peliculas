import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * Botón de volver de las zonas que se abren desde Inicio (Azar, Pila,
 * Ranking, Estadísticas, Retos, Wrapped). Usa dismissTo como la barra
 * inferior, así siempre se llega a Inicio sin acumular pantallas.
 */
export function HomeBackButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver al inicio"
      onPress={() => router.dismissTo('/explore')}
      style={styles.button}>
      <Text style={styles.icon}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  icon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
});
