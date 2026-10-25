// Una espera que superó su tiempo máximo.
export class TimeoutError extends Error {
  constructor(message = 'La operación tardó demasiado.') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Corre run con una señal que se cancela a los timeoutMs, así una API que no
 * responde no deja una pantalla cargando sin fin. Si se cancela antes la
 * señal de quien llama, run recibe la cancelación de siempre (AbortError).
 */
export function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  { signal, timeoutMs }: { signal?: AbortSignal; timeoutMs: number }
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Primero el rechazo por tiempo: la cancelación de run llega después.
      reject(new TimeoutError());
      controller.abort();
    }, timeoutMs);
  });

  return Promise.race([run(controller.signal), timeout]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  });
}
