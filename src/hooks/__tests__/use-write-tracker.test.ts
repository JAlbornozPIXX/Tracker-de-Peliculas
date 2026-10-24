import { createWriteTracker } from '../use-write-tracker';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createWriteTracker', () => {
  it('sin escrituras, la carga se aplica', () => {
    const writes = createWriteTracker();
    expect(writes.isQuietSince(writes.snapshot())).toBe(true);
  });

  it('una escritura que empezó durante la carga la descarta, aunque ya terminó', async () => {
    const writes = createWriteTracker();
    const snapshot = writes.snapshot();
    await writes.track(async () => {});
    expect(writes.isQuietSince(snapshot)).toBe(false);
  });

  it('una escritura que ya estaba en curso al empezar la carga también la descarta', async () => {
    const writes = createWriteTracker();
    const pending = deferred();
    const write = writes.track(() => pending.promise);
    const snapshot = writes.snapshot();
    pending.resolve();
    await write;
    expect(writes.isQuietSince(snapshot)).toBe(false);
    // La carga siguiente, ya sin escrituras, sí se aplica.
    expect(writes.isQuietSince(writes.snapshot())).toBe(true);
  });

  it('devuelve el resultado de la escritura y propaga su error', async () => {
    const writes = createWriteTracker();
    await expect(writes.track(async () => 42)).resolves.toBe(42);
    await expect(writes.track(() => Promise.reject(new Error('sin red')))).rejects.toThrow('sin red');
    expect(writes.snapshot().busy).toBe(false);
  });
});

describe('loadWhenIdle', () => {
  it('sin escrituras carga y aplica al instante', async () => {
    const writes = createWriteTracker();
    const apply = jest.fn();
    writes.loadWhenIdle(async () => 'servidor', apply);
    await Promise.resolve();
    await Promise.resolve();
    expect(apply).toHaveBeenCalledWith('servidor');
  });

  it('con una escritura en curso espera a que termine para cargar', async () => {
    const writes = createWriteTracker();
    const pending = deferred();
    const write = writes.track(() => pending.promise);
    const load = jest.fn(async () => 'después de guardar');
    const apply = jest.fn();
    writes.loadWhenIdle(load, apply);
    expect(load).not.toHaveBeenCalled();

    pending.resolve();
    await write;
    await Promise.resolve();
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith('después de guardar');
  });

  it('si una escritura se cruza con la carga, la repite al terminar en vez de perderla', async () => {
    const writes = createWriteTracker();
    const firstLoad = deferred();
    let calls = 0;
    const load = jest.fn(async () => {
      calls += 1;
      if (calls === 1) await firstLoad.promise;
      return `lectura ${calls}`;
    });
    const apply = jest.fn();
    writes.loadWhenIdle(load, apply);

    // Empieza y termina una escritura mientras la primera lectura viaja.
    await writes.track(async () => {});
    firstLoad.resolve();
    for (let i = 0; i < 6; i++) await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith('lectura 2');
  });

  it('cancelar evita aplicar una carga que llega tarde', async () => {
    const writes = createWriteTracker();
    const apply = jest.fn();
    const cancel = writes.loadWhenIdle(async () => 'tarde', apply);
    cancel();
    await Promise.resolve();
    await Promise.resolve();
    expect(apply).not.toHaveBeenCalled();
  });
});
