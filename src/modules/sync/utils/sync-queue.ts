import { ApplyOutcome, applyWrite, RemoteError, SyncRemote } from '@/modules/sync/utils/apply-write';
import { mergeWrite, PendingWrite, writeKey } from '@/modules/sync/utils/pending-writes';

export type SyncStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

// superseded: el servidor ya tenía un cambio más reciente de ese dato y se quedó con ese.
export type SaveResult = 'saved' | 'pending' | 'superseded';

const storageKey = (userId: string) => `cineteca:pending-writes:v1:${userId}`;

function parseStored(raw: string | null): PendingWrite[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Cola de escrituras del usuario con sesión. Cada cambio se guarda primero en
 * el teléfono y después se intenta subir; si no hay red queda pendiente hasta
 * el próximo flush (al abrir la app, al recuperar sesión, etc.).
 */
export function createSyncQueue({ storage, remote }: { storage: SyncStorage; remote: SyncRemote }) {
  let userId: string | null = null;
  let queue: PendingWrite[] = [];
  let ready: Promise<void> = Promise.resolve();
  let flushing: Promise<void> | null = null;
  let flushAgain = false;
  const listeners = new Set<() => void>();
  const discardListeners = new Set<(movieId: number) => void>();
  // Rechazos del servidor, para que save() los devuelva como error a la UI.
  const rejections = new WeakMap<PendingWrite, RemoteError>();
  // Escrituras que perdieron contra un cambio más reciente del servidor.
  const superseded = new WeakSet<PendingWrite>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  async function persist(forUser: string) {
    if (userId !== forUser) return;
    try {
      await storage.setItem(storageKey(forUser), JSON.stringify(queue));
    } catch {
      // Sin almacenamiento la cola sigue en memoria mientras la app esté abierta.
    }
  }

  function setUser(nextUserId: string | null): Promise<void> {
    if (nextUserId === userId) return ready;
    userId = nextUserId;
    queue = [];
    notify();
    if (!nextUserId) {
      ready = Promise.resolve();
      return ready;
    }
    ready = storage
      .getItem(storageKey(nextUserId))
      .catch(() => null)
      .then((raw) => {
        if (userId !== nextUserId) return;
        // Lo que se encoló mientras se leía es más nuevo que lo guardado.
        queue = queue.reduce(mergeWrite, parseStored(raw));
        notify();
      });
    return ready;
  }

  async function flushPass() {
    await ready;
    const forUser = userId;
    if (!forUser) return;
    // Sin sesión válida (token vencido que no se pudo renovar) se espera al
    // próximo flush en vez de subir como anónimo.
    const signedIn = await remote.hasSession(forUser).catch(() => false);
    if (!signedIn || userId !== forUser) return;

    for (const write of [...queue]) {
      let outcome: ApplyOutcome;
      try {
        outcome = await applyWrite(forUser, write, remote);
      } catch {
        outcome = { type: 'retry' };
      }
      if (userId !== forUser) return;
      // Sin red o sin sesión el resto fallaría igual: queda para el próximo flush.
      if (outcome.type === 'retry') return;

      if (outcome.type === 'rejected') rejections.set(write, outcome.error);
      if (outcome.type === 'superseded') superseded.add(write);
      // Por identidad: si se combinó con un cambio nuevo mientras subía, ese queda.
      queue = queue.filter((entry) => entry !== write);
      notify();
      await persist(forUser);
      if (outcome.type !== 'saved') discardListeners.forEach((listener) => listener(write.movieId));
    }
  }

  function flush(): Promise<void> {
    if (flushing) {
      flushAgain = true;
      return flushing;
    }
    flushing = (async () => {
      try {
        do {
          flushAgain = false;
          await flushPass();
        } while (flushAgain);
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  /**
   * Guarda el cambio en el teléfono e intenta subirlo. Devuelve 'pending' si
   * quedó para después y 'superseded' si el servidor tenía uno más reciente;
   * lanza el error si el servidor lo rechazó.
   */
  async function save(forUser: string, write: PendingWrite): Promise<SaveResult> {
    await setUser(forUser);
    const key = writeKey(write);
    queue = mergeWrite(queue, write);
    const entry = queue.find((item) => writeKey(item) === key)!;
    notify();
    await persist(forUser);
    await flush();

    const error = rejections.get(entry);
    // Supabase devuelve objetos planos: como Error, la UI puede mostrar el mensaje.
    if (error) throw new Error(error.message);
    if (queue.some((item) => writeKey(item) === key)) return 'pending';
    return superseded.has(entry) ? 'superseded' : 'saved';
  }

  async function pendingFor(forUser: string, movieId: number): Promise<PendingWrite[]> {
    await setUser(forUser);
    return queue.filter((write) => write.movieId === movieId);
  }

  return {
    setUser,
    save,
    flush,
    pendingFor,
    hasPending: (movieId: number) => queue.some((write) => write.movieId === movieId),
    pendingCount: () => queue.length,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Avisa cuando un cambio pendiente se descarta porque el servidor tenía uno más nuevo o lo rechazó. */
    subscribeDiscarded(listener: (movieId: number) => void) {
      discardListeners.add(listener);
      return () => {
        discardListeners.delete(listener);
      };
    },
  };
}
