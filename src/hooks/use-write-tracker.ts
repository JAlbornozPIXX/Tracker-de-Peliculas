import { useState } from 'react';

export type WriteSnapshot = { started: number; busy: boolean };

/**
 * Para descartar una carga que se cruzó con una escritura: lo que llega del
 * servidor puede no incluirla (o incluirla dos veces si la escritura después
 * la agrega al estado), y el estado local ya tiene el cambio.
 *
 * Cada escritura va dentro de track(). Antes de cargar se toma snapshot(); al
 * llegar los datos, isQuietSince(snapshot) es true si en ese lapso no empezó
 * ninguna escritura y no había ninguna en curso.
 */
export function createWriteTracker() {
  let started = 0;
  let inFlight = 0;

  return {
    async track<T>(write: () => Promise<T>): Promise<T> {
      started += 1;
      inFlight += 1;
      try {
        return await write();
      } finally {
        inFlight -= 1;
      }
    },
    snapshot: (): WriteSnapshot => ({ started, busy: inFlight > 0 }),
    isQuietSince: (snapshot: WriteSnapshot) => !snapshot.busy && inFlight === 0 && started === snapshot.started,
  };
}

// Uno por componente, estable entre renders.
export function useWriteTracker() {
  const [tracker] = useState(createWriteTracker);
  return tracker;
}
