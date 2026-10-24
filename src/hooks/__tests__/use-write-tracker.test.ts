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
