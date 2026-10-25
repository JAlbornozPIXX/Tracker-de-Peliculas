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
 * Pregunta qué hacer con los cambios sin guardar al salir de una pantalla.
 * En web window.confirm solo tiene Aceptar y Cancelar: aceptar sale sin
 * guardar.
 */
export function confirmUnsavedChanges({ onSave, onDiscard }: { onSave: () => void; onDiscard: () => void }) {
  if (Platform.OS === 'web') {
    if (window.confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?')) onDiscard();
    return;
  }
  Alert.alert('Tienes cambios sin guardar', '¿Quieres guardarlos antes de salir?', [
    { text: 'Seguir editando', style: 'cancel' },
    { text: 'Descartar', style: 'destructive', onPress: onDiscard },
    { text: 'Guardar', onPress: onSave },
  ]);
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
