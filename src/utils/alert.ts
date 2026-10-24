import { Alert, Platform } from 'react-native';

/**
 * Aviso con un solo botón. En web, Alert.alert de React Native no muestra
 * nada, así que se usa window.alert.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Texto de un error para mostrarlo. Los errores de Supabase llegan como
 * objetos planos con message, no como instancias de Error.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return '';
}
