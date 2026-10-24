import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Nunca cambia: solo distingue el render estático (y la hidratación) del cliente.
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // false en el render estático y al hidratar; true en el cliente después.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
