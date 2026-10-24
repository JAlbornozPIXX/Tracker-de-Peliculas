import { createSyncQueue } from '../sync-queue';
import { createFakeServer, createFakeStorage, serverRow } from '@/modules/sync/testing/fake-server';

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
    expect(server.selectedReactions()).toEqual([`${MOVIE}:1`]);
  });

  it('con red se guarda al instante', async () => {
    const { server, open } = setup();
    await expect(
      open().save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { status: 'watchlist' }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('saved');
    expect(server.rows.get(MOVIE)?.status).toBe('watchlist');
  });
});

describe('gana el más reciente', () => {
  it('si el servidor tiene un cambio más nuevo, el pendiente se descarta', async () => {
    const { server, open } = setup();
    const queue = open();
    const discarded = jest.fn();
    queue.subscribeDiscarded(discarded);

    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'desde el teléfono' }, changedAt: '2026-10-21T10:00:00.000Z' });

    // Mientras tanto, otro dispositivo guardó más tarde.
    server.rows.set(MOVIE, serverRow({ status: 'watched', rating: 5, notes: 'desde el otro' }, '2026-10-21T11:00:00.000Z'));

    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)?.notes).toBe('desde el otro');
    expect(queue.hasPending(MOVIE)).toBe(false);
    expect(discarded).toHaveBeenCalledWith(MOVIE, 'user_movie');
  });

  it('si el pendiente es más nuevo que el servidor, se aplica', async () => {
    const { server, open } = setup();
    const queue = open();
    server.rows.set(MOVIE, serverRow({ status: 'watching', rating: null, notes: 'vieja' }, '2026-10-21T09:00:00.000Z'));

    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'nueva' }, changedAt: '2026-10-21T10:00:00.000Z' });
    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)).toMatchObject({ status: 'watching', notes: 'nueva' });
    expect(server.rows.get(MOVIE)?.changedAt.notes).toBe('2026-10-21T10:00:00.000Z');
  });
});

describe('gana el más reciente, campo por campo', () => {
  it('un cambio viejo no pisa uno más nuevo del servidor aunque se junte con otro más nuevo', async () => {
    const { server, open } = setup();
    const queue = open();
    const discarded = jest.fn();
    queue.subscribeDiscarded(discarded);
    server.rows.set(MOVIE, serverRow({ status: 'watched', rating: 3, notes: null }, '2026-10-21T09:00:00.000Z'));

    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { rating: 2 }, changedAt: '2026-10-21T10:00:00.000Z' });
    // Otro dispositivo cambia las estrellas después; luego en el teléfono se escribe la nota.
    server.rows.set(
      MOVIE,
      serverRow({ status: 'watched', rating: 5, notes: null }, '2026-10-21T09:00:00.000Z', { rating: '2026-10-21T10:10:00.000Z' })
    );
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'la vi de nuevo' }, changedAt: '2026-10-21T10:20:00.000Z' });

    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)).toMatchObject({ rating: 5, notes: 'la vi de nuevo' });
    expect(queue.hasPending(MOVIE)).toBe(false);
    // La ficha vuelve a leer: las estrellas que mostraba no quedaron en el servidor.
    expect(discarded).toHaveBeenCalledWith(MOVIE, 'user_movie');
  });

  it('un cambio más nuevo en otro campo no descarta el pendiente', async () => {
    const { server, open } = setup();
    const queue = open();
    server.rows.set(MOVIE, serverRow({ status: 'watched', rating: 3, notes: null }, '2026-10-21T09:00:00.000Z'));

    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { rating: 4.25 }, changedAt: '2026-10-21T10:00:00.000Z' });
    // Mientras tanto, otro dispositivo escribió la nota.
    server.rows.set(
      MOVIE,
      serverRow({ status: 'watched', rating: 3, notes: 'desde el otro' }, '2026-10-21T09:00:00.000Z', { notes: '2026-10-21T10:10:00.000Z' })
    );

    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)).toMatchObject({ rating: 4.25, notes: 'desde el otro' });
  });

  it('save() avisa cuando el servidor tenía un cambio más reciente', async () => {
    const { server, open } = setup();
    server.rows.set(MOVIE, serverRow({ status: 'watched', rating: 3, notes: 'nueva' }, '2026-10-21T11:00:00.000Z'));
    await expect(
      open().save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'vieja' }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('superseded');
    expect(server.rows.get(MOVIE)?.notes).toBe('nueva');
  });

  it('los cambios que guardó la versión anterior de la app siguen subiendo', async () => {
    const { server, storage, open } = setup();
    server.rows.set(MOVIE, serverRow({ status: 'watching', rating: null, notes: null }, '2026-10-21T09:00:00.000Z'));
    // Sin fieldChangedAt: todos los campos toman changedAt.
    storage.data.set(
      `cineteca:pending-writes:v1:${USER}`,
      JSON.stringify([
        { kind: 'user_movie', movieId: MOVIE, fields: { status: 'watched', rating: 4 }, changedAt: '2026-10-21T10:00:00.000Z' },
      ])
    );

    const queue = open();
    await queue.setUser(USER);
    await queue.flush();

    expect(queue.hasPending(MOVIE)).toBe(false);
    expect(server.rows.get(MOVIE)).toMatchObject({ status: 'watched', rating: 4 });
  });
});

describe('calificadores: gana el más reciente', () => {
  const key = `${MOVIE}:1`;

  it('desmarcar sin red no gana sobre un marcado más reciente de otro dispositivo', async () => {
    const { server, open } = setup();
    const queue = open();
    server.reactions.set(key, { selected: true, changedAt: '2026-10-21T09:00:00.000Z' });

    server.state.online = false;
    await queue.save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 1, selected: false, changedAt: '2026-10-21T10:00:00.000Z' });
    // El otro dispositivo lo desmarcó y lo volvió a marcar después.
    server.reactions.set(key, { selected: true, changedAt: '2026-10-21T10:10:00.000Z' });

    server.state.online = true;
    await queue.flush();
    expect(server.reactions.get(key)).toEqual({ selected: true, changedAt: '2026-10-21T10:10:00.000Z' });
  });

  it('marcar sin red gana sobre un desmarcado más viejo', async () => {
    const { server, open } = setup();
    const queue = open();
    server.reactions.set(key, { selected: false, changedAt: '2026-10-21T09:00:00.000Z' });

    server.state.online = false;
    await queue.save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 1, selected: true, changedAt: '2026-10-21T10:00:00.000Z' });
    server.state.online = true;
    await queue.flush();

    expect(server.selectedReactions()).toEqual([key]);
  });

  it('desmarcar deja la marca como no seleccionada, con su hora, en vez de borrarla', async () => {
    const { server, open } = setup();
    server.reactions.set(key, { selected: true, changedAt: '2026-10-21T09:00:00.000Z' });
    await expect(
      open().save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 1, selected: false, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('saved');
    expect(server.reactions.get(key)).toEqual({ selected: false, changedAt: '2026-10-21T10:00:00.000Z' });
    expect(server.selectedReactions()).toEqual([]);
  });
});

describe('vista automática sin red', () => {
  const today = '2026-10-21';

  it('pasar a Terminada sin red guarda la vista en el teléfono y la sube al volver la red', async () => {
    const { server, open } = setup();
    const queue = open();
    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { status: 'watched' }, changedAt: '2026-10-21T10:00:00.000Z' });
    await expect(
      queue.save(USER, { kind: 'auto_view', movieId: MOVIE, viewedOn: today, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('pending');
    expect(queue.pendingAutoViewDates(MOVIE)).toEqual([today]);

    // Volver a marcar Terminada el mismo día no agrega otra.
    await queue.save(USER, { kind: 'auto_view', movieId: MOVIE, viewedOn: today, changedAt: '2026-10-21T10:05:00.000Z' });
    expect(queue.pendingCount()).toBe(2);

    server.state.online = true;
    await queue.flush();
    expect(server.rows.get(MOVIE)?.status).toBe('watched');
    expect(server.views).toEqual([{ movieId: MOVIE, viewedOn: today, source: 'auto' }]);
    expect(queue.pendingAutoViewDates(MOVIE)).toEqual([]);
  });

  it('no suma otra si ese día ya hay una vista', async () => {
    const { server, open } = setup();
    server.views.push({ movieId: MOVIE, viewedOn: today, source: 'manual' });
    await expect(
      open().save(USER, { kind: 'auto_view', movieId: MOVIE, viewedOn: today, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('saved');
    expect(server.views).toHaveLength(1);
  });
});

describe('casos de borde de la cola', () => {
  it('si otro dispositivo crea la fila entre el update y el insert, se actualiza en la segunda vuelta', async () => {
    const { server, open } = setup();
    const insert = server.remote.insertUserMovie;
    server.remote.insertUserMovie = async (...args) => {
      // El otro dispositivo gana la carrera: la fila ya existe, con una hora anterior.
      server.rows.set(MOVIE, serverRow({ status: 'watchlist', rating: null, notes: null }, '2026-10-21T09:00:00.000Z'));
      server.remote.insertUserMovie = insert;
      return { status: 409, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
    };

    await expect(
      open().save(USER, {
        kind: 'user_movie',
        movieId: MOVIE,
        fields: { status: 'watched', rating: 4 },
        changedAt: '2026-10-21T10:00:00.000Z',
      })
    ).resolves.toBe('saved');
    expect(server.rows.get(MOVIE)).toMatchObject({ status: 'watched', rating: 4 });
  });

  it('el insert guarda la hora de cada campo', async () => {
    const { server, open } = setup();
    const queue = open();
    server.state.online = false;
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { status: 'watched' }, changedAt: '2026-10-21T10:00:00.000Z' });
    await queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { notes: 'después' }, changedAt: '2026-10-21T10:05:00.000Z' });
    server.state.online = true;
    await queue.flush();

    expect(server.rows.get(MOVIE)?.changedAt).toEqual({
      status: '2026-10-21T10:00:00.000Z',
      rating: '2026-10-21T10:00:00.000Z',
      notes: '2026-10-21T10:05:00.000Z',
    });
  });

  it('el aviso de descarte dice qué dato volver a leer', async () => {
    const { server, open } = setup();
    const queue = open();
    const discarded = jest.fn();
    queue.subscribeDiscarded(discarded);
    server.reactions.set(`${MOVIE}:1`, { selected: true, changedAt: '2026-10-21T11:00:00.000Z' });

    await queue.save(USER, { kind: 'reaction', movieId: MOVIE, reactionId: 1, selected: false, changedAt: '2026-10-21T10:00:00.000Z' });
    expect(discarded).toHaveBeenCalledWith(MOVIE, 'reaction');
  });

  it('una entrada guardada que esta versión no conoce se descarta y no traba la cola', async () => {
    const { server, storage, open } = setup();
    storage.data.set(
      `cineteca:pending-writes:v1:${USER}`,
      JSON.stringify([
        { kind: 'algo_nuevo', movieId: MOVIE, changedAt: '2026-10-21T09:00:00.000Z' },
        { kind: 'reaction', movieId: MOVIE, reactionId: 2, selected: true, changedAt: '2026-10-21T10:00:00.000Z' },
      ])
    );
    const queue = open();
    await queue.setUser(USER);
    expect(queue.pendingCount()).toBe(1);
    await queue.flush();
    expect(queue.pendingCount()).toBe(0);
    expect(server.selectedReactions()).toEqual([`${MOVIE}:2`]);
  });
});

describe('base sin actualizar', () => {
  it('si falta una columna nueva de schema.sql, el cambio queda pendiente en vez de perderse', async () => {
    const { server, open } = setup();
    const queue = open();
    server.remote.updateUserMovieFieldIfOlder = async () => ({
      status: 400,
      applied: false,
      error: { message: "Could not find the 'rating_changed_at' column of 'user_movies' in the schema cache", code: 'PGRST204' },
    });

    await expect(
      queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { rating: 4 }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('pending');
    expect(queue.hasPending(MOVIE)).toBe(true);
  });
});

describe('rechazos del servidor', () => {
  it('no se reintentan y save() lanza el mensaje', async () => {
    const { server, open } = setup();
    const queue = open();
    server.remote.updateUserMovieFieldIfOlder = async () => ({
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

describe('sin sesión válida', () => {
  it('no sube ni descarta los pendientes hasta que vuelve la sesión', async () => {
    const { server, open } = setup();
    const queue = open();
    server.rows.set(MOVIE, serverRow({ status: 'watched', rating: 3, notes: null }, '2026-10-21T09:00:00.000Z'));

    // El token venció y no se pudo renovar: las peticiones saldrían como anónimas.
    server.state.signedIn = false;
    await expect(
      queue.save(USER, { kind: 'user_movie', movieId: MOVIE, fields: { rating: 4.5 }, changedAt: '2026-10-21T10:00:00.000Z' })
    ).resolves.toBe('pending');
    expect(server.state.calls).toBe(0);
    expect(queue.hasPending(MOVIE)).toBe(true);

    server.state.signedIn = true;
    await queue.flush();
    expect(queue.hasPending(MOVIE)).toBe(false);
    expect(server.rows.get(MOVIE)).toMatchObject({ rating: 4.5 });
  });
});
