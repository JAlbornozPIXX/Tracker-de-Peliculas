import { useState } from 'react';

export type WriteSnapshot = { started: number; busy: boolean };

/**
 * Para que una carga no pise una escritura con la que se cruzó: lo que llega
 * del servidor puede no incluirla (o incluirla dos veces si la escritura
 * después la agrega al estado), y el estado local ya tiene el cambio.
 *
 * Cada escritura va dentro de track(). loadWhenIdle carga cuando no hay
 * escrituras en curso y, si mientras tanto empezó otra, vuelve a cargar
 * cuando esa termine.
 */
export function createWriteTracker() {
  let started = 0;
  let inFlight = 0;
  let idleCallbacks: (() => void)[] = [];

  const snapshot = (): WriteSnapshot => ({ started, busy: inFlight > 0 });
  const isQuietSince = (since: WriteSnapshot) => !since.busy && inFlight === 0 && started === since.started;

  // Ejecuta fn cuando no quede ninguna escritura en curso (al instante si no
  // hay). Devuelve la función que lo cancela.
  function whenIdle(fn: () => void): () => void {
    if (inFlight === 0) {
      fn();
      return () => {};
    }
    idleCallbacks.push(fn);
    return () => {
      idleCallbacks = idleCallbacks.filter((callback) => callback !== fn);
    };
  }

  return {
    async track<T>(write: () => Promise<T>): Promise<T> {
      started += 1;
      inFlight += 1;
      try {
        return await write();
      } finally {
        inFlight -= 1;
        if (inFlight === 0) {
          const callbacks = idleCallbacks;
          idleCallbacks = [];
          callbacks.forEach((callback) => callback());
        }
      }
    },
    snapshot,
    isQuietSince,
    /**
     * Carga con load y pasa el resultado a apply si no se cruzó con ninguna
     * escritura; si se cruzó, repite cuando terminen. Devuelve la función que
     * lo cancela (para la limpieza de un efecto).
     */
    loadWhenIdle<T>(load: () => Promise<T>, apply: (value: T) => void, onError?: (err: unknown) => void): () => void {
      let cancelled = false;
      let cancelWait = () => {};
      const run = () => {
        cancelWait = whenIdle(() => {
          const since = snapshot();
          load().then(
            (value) => {
              if (cancelled) return;
              if (isQuietSince(since)) apply(value);
              else run();
            },
            (err) => {
              if (!cancelled) onError?.(err);
            }
          );
        });
      };
      run();
      return () => {
        cancelled = true;
        cancelWait();
      };
    },
  };
}

export type WriteTracker = ReturnType<typeof createWriteTracker>;

// Uno por componente, estable entre renders.
export function useWriteTracker(): WriteTracker {
  const [tracker] = useState(createWriteTracker);
  return tracker;
}
