import { useEffect, useState } from 'react';

/**
 * Devuelve una versión "debounced" de `value`: solo se actualiza
 * después de que pasen `delayMs` milisegundos sin que `value` cambie.
 * Útil para no disparar una llamada a una API en cada pulsación de tecla.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
