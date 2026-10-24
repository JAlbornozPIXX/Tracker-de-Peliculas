import {
  applyPendingToReactions,
  applyPendingToUserMovie,
  applyPendingToWatchedIds,
  isRetryableStatus,
  mergeWrite,
  PendingWrite,
} from '../pending-writes';

const at = '2026-10-21T10:00:00.000Z';

describe('mergeWrite', () => {
  it('junta los campos pendientes de la misma película', () => {
    const queue = mergeWrite([], { kind: 'user_movie', movieId: 1, fields: { status: 'watching' }, changedAt: at });
    const next = mergeWrite(queue, { kind: 'user_movie', movieId: 1, fields: { notes: 'hola' }, changedAt: '2026-10-21T10:01:00.000Z' });
    expect(next).toEqual([
      { kind: 'user_movie', movieId: 1, fields: { status: 'watching', notes: 'hola' }, changedAt: '2026-10-21T10:01:00.000Z' },
    ]);
  });

  it('en un calificador se queda con el último estado', () => {
    const queue = mergeWrite([], { kind: 'reaction', movieId: 1, reactionId: 3, selected: true, changedAt: at });
    const next = mergeWrite(queue, { kind: 'reaction', movieId: 1, reactionId: 3, selected: false, changedAt: at });
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ selected: false });
  });
});

describe('isRetryableStatus', () => {
  it('reintenta sin red, sin sesión o con error del servidor', () => {
    [0, 401, 408, 429, 500, 503].forEach((status) => expect(isRetryableStatus(status)).toBe(true));
  });

  it('no reintenta un rechazo como RLS o validación', () => {
    [400, 403, 404, 409].forEach((status) => expect(isRetryableStatus(status)).toBe(false));
  });
});

describe('superponer pendientes', () => {
  const writes: PendingWrite[] = [
    { kind: 'user_movie', movieId: 1, fields: { rating: 5 }, changedAt: at },
    { kind: 'reaction', movieId: 1, reactionId: 2, selected: false, changedAt: at },
    { kind: 'reaction', movieId: 1, reactionId: 4, selected: true, changedAt: at },
  ];

  it('muestra los campos pendientes sobre los del servidor', () => {
    expect(applyPendingToUserMovie({ status: 'watched', rating: 3, notes: 'x' }, writes)).toEqual({
      status: 'watched',
      rating: 5,
      notes: 'x',
    });
  });

  it('una fila que aún no existe en el servidor aparece si el pendiente trae estado', () => {
    expect(applyPendingToUserMovie(null, writes)).toBeNull();
    expect(
      applyPendingToUserMovie(null, [{ kind: 'user_movie', movieId: 1, fields: { status: 'watching' }, changedAt: at }])
    ).toEqual({ status: 'watching', rating: null, notes: null });
  });

  it('aplica los calificadores marcados y desmarcados', () => {
    expect(applyPendingToReactions([1, 2], writes)).toEqual([1, 4]);
  });

  it('un estado pendiente suma o quita la película de las Terminadas', () => {
    const pending: PendingWrite[] = [
      { kind: 'user_movie', movieId: 2, fields: { status: 'watched' }, changedAt: at },
      { kind: 'user_movie', movieId: 3, fields: { status: 'watching' }, changedAt: at },
      { kind: 'user_movie', movieId: 4, fields: { rating: 4 }, changedAt: at },
      { kind: 'reaction', movieId: 5, reactionId: 1, selected: true, changedAt: at },
    ];
    const watched = new Set([3, 4, 5]);
    expect(applyPendingToWatchedIds(watched, pending)).toEqual(new Set([2, 4, 5]));
    expect(watched).toEqual(new Set([3, 4, 5]));
  });
});
