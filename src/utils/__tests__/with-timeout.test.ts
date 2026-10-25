import { TimeoutError, withTimeout } from '../with-timeout';

// Como fetch: queda esperando y rechaza con AbortError cuando se cancela su señal.
function pendingUntilAbort(signal: AbortSignal): Promise<never> {
  const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });
  return new Promise((_, reject) => {
    if (signal.aborted) reject(abortError());
    signal.addEventListener('abort', () => reject(abortError()));
  });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('withTimeout', () => {
  it('devuelve el resultado si llega a tiempo y no deja el temporizador pendiente', async () => {
    await expect(withTimeout(async () => 'resultados', { timeoutMs: 1000 })).resolves.toBe('resultados');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('propaga el error de run tal cual', async () => {
    const failure = new Error('TheMovieDB respondió con un error (503).');
    await expect(withTimeout(() => Promise.reject(failure), { timeoutMs: 1000 })).rejects.toBe(failure);
  });

  it('a los timeoutMs rechaza con TimeoutError y cancela la petición', async () => {
    let received: AbortSignal | undefined;
    const result = withTimeout(
      (signal) => {
        received = signal;
        return pendingUntilAbort(signal);
      },
      { timeoutMs: 1000 }
    );

    jest.advanceTimersByTime(999);
    expect(received?.aborted).toBe(false);
    jest.advanceTimersByTime(1);

    await expect(result).rejects.toBeInstanceOf(TimeoutError);
    expect(received?.aborted).toBe(true);
  });

  it('si quien llama cancela, rechaza con AbortError y no por tiempo', async () => {
    const controller = new AbortController();
    const result = withTimeout(pendingUntilAbort, { signal: controller.signal, timeoutMs: 1000 });

    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('con la señal de quien llama ya cancelada, run empieza cancelado', async () => {
    const controller = new AbortController();
    controller.abort();
    let received: AbortSignal | undefined;

    const result = withTimeout(
      (signal) => {
        received = signal;
        return pendingUntilAbort(signal);
      },
      { signal: controller.signal, timeoutMs: 1000 }
    );

    expect(received?.aborted).toBe(true);
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
