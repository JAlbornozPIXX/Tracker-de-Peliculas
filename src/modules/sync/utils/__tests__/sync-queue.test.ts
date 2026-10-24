import { createSyncQueue } from '../sync-queue';
import { createFakeServer, createFakeStorage } from '@/modules/sync/testing/fake-server';

const USER = 'user-1';
const MOVIE = 7;

function setup() {
  const server = createFakeServer();
  const storage = createFakeStorage();
  const open = () => createSyncQueue({ storage, remote: server.remote });
  return { server, storage, open };
}

describe('sin red', () => {
  it('cambiar estado y nota queda pendiente y se guarda solo al volver la red', async () => {
    const { server, open } = setup();
    const queue = open();
    server.state.online = false;

    await expect(
      queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { status: 'watching' }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('pending');
    await expect(
      queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'muy buena' }, changedAt: '2026-10-21T10:00:05.000Z' })
    ).resolves.toBe('pending');
    expect(queue.hasPending(MOVIE)).toBe(true);
    expect(server.rows.size).toBe(0);

    server.state.online = true;
    await queue.flush();

    expect(queue.hasPending(MOVIE)).toBe(false);
    expect(server.rows.get(MOVIE)).toMatchObject({ status: 'watching', notes: 'muy buena' });
  });

  it('los pendientes sobreviven a cerrar y volver a abrir la app', async () => {
    const { server, open } = setup();
    server.state.online = false;
    await open().save(USER, {
      kind: 'user_movie',
      movieId: MOVIE,
      fields: { status: 'watched', rating: 4.5 },
      changedAt: '2026-10-21T10:00:00.000Z',
    });

    server.state.online = true;
    const reopened = open();
    await reopened.setUser(USER);
    expect(reopened.hasPending(MOVIE)).toBe(true);

    await reopened.flush();
    expect(reopened.hasPending(MOVIE)).toBe(false);
    expect(server.rows.get(MOVIE)).toMatchObject({ status: 'watched', rating: 4.5 });
  });

  it('los calificadores marcados sin red se suben después', async () => {
    const { server, open } = setup();
    const queue = open();
    server.state.online = false;
    await queue.save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 1, selected: true, changedAt: '2026-10-21T10:00:00.000Z' });
    await queue.save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 2, selected: true, changedAt: '2026-10-21T10:00:01.000Z' });
    await queue.save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 2, selected: false, changedAt: '2026-10-21T10:00:02.000Z' });

    server.state.online = true;
    await queue.flush();
    expect([...server.reactions]).toEqual([`${MOVIE}:1`]);
  });

  it('con red se guarda al instante', async () => {
    const { server, open } = setup();
    await expect(
      open().save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { status: 'watchlist' }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('saved');
    expect(server.rows.get(MOVIE)?.status).toBe('watchlist');
  });
});

describe('gana el más reciente según updated_at', () => {
  it('si el servidor tiene un cambio más nuevo, el pendiente se descarta', async () => {
    const { server, open } = setup();
    const queue = open();
    const discarded = jest.fn();
    queue.subscribeDiscarded(discarded);

    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'desde el teléfono' }, changedAt: '2026-10-21T10:00:00.000Z' });

    // Mientras tanto, otro dispositivo guardó más tarde.
    server.rows.set(MOVIE, { status: 'watched', rating: 5, notes: 'desde el otro', updatedAt: '2026-10-21T11:00:00.000Z' });

    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)?.notes).toBe('desde el otro');
    expect(queue.hasPending(MOVIE)).toBe(false);
    expect(discarded).toHaveBeenCalledWith(MOVIE);
  });

  it('si el pendiente es más nuevo que el servidor, se aplica', async () => {
    const { server, open } = setup();
    const queue = open();
    server.rows.set(MOVIE, { status: 'watching', rating: null, notes: 'vieja', updatedAt: '2026-10-21T09:00:00.000Z' });

    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'nueva' }, changedAt: '2026-10-21T10:00:00.000Z' });
    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)).toMatchObject({ status: 'watching', notes: 'nueva', updatedAt: '2026-10-21T10:00:00.000Z' });
  });
});

describe('rechazos del servidor', () => {
  it('no se reintentan y save() lanza el mensaje', async () => {
    const { server, open } = setup();
    const queue = open();
    server.remote.updateUserMovieIfOlder = async () => ({
      status: 400,
      applied: false,
      error: { message: 'violates check constraint', details: '', hint: '', code: '23514' },
    });

    await expect(
      queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { rating: 9 }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).rejects.toThrow('violates check constraint');
    expect(queue.hasPending(MOVIE)).toBe(false);
  });
});

describe('sin red no insiste', () => {
  it('corta la pasada en el primer fallo de red', async () => {
    const { server, open } = setup();
    const queue = open();
    server.state.online = false;
    for (const movieId of [1, 2, 3]) {
      await queue.save(USER, { kind: 'user_movie', movieId, fields: { status: 'watchlist' }, changedAt: '2026-10-21T10:00:00.000Z' });
    }
    server.state.calls = 0;
    await queue.flush();
    expect(server.state.calls).toBe(1);
    expect(queue.pendingCount()).toBe(3);
  });
});
