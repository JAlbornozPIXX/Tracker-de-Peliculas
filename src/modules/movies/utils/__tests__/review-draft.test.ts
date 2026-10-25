import {
  diffReview,
  EMPTY_REVIEW,
  hasChanges,
  rateDraft,
  rebaseDraft,
  ReviewDraft,
  setMembership,
  toggleId,
} from '../review-draft';

const SAVED: ReviewDraft = { status: 'watching', rating: 3.5, notes: 'buena', listIds: [1, 2], reactionIds: [7] };

describe('rateDraft', () => {
  it('calificar un título sin estado lo deja Terminado (A1)', () => {
    expect(rateDraft(EMPTY_REVIEW, 4.25)).toMatchObject({ status: 'watched', rating: 4.25 });
  });

  it('con estado solo cambia las estrellas', () => {
    expect(rateDraft(SAVED, 5)).toEqual({ ...SAVED, rating: 5 });
    expect(rateDraft(SAVED, null)).toEqual({ ...SAVED, rating: null });
  });
});

describe('diffReview', () => {
  it('sin cambios no hay nada que guardar', () => {
    const changes = diffReview(SAVED, { ...SAVED, listIds: [2, 1] });
    expect(hasChanges(changes)).toBe(false);
  });

  it('solo incluye los campos que cambiaron, con la nota vacía como null', () => {
    const changes = diffReview(SAVED, { ...SAVED, rating: 4, notes: '' });
    expect(changes.fields).toEqual({ rating: 4, notes: null });
    expect(changes.finished).toBe(false);
  });

  it('estrellas y nota de un título nuevo van junto con su estado en una sola escritura', () => {
    const draft = { ...rateDraft(EMPTY_REVIEW, 4), notes: 'la vi en el cine' };
    expect(diffReview(EMPTY_REVIEW, draft).fields).toEqual({ status: 'watched', rating: 4, notes: 'la vi en el cine' });
  });

  it('registra la vista solo cuando el estado pasa a Terminado', () => {
    expect(diffReview(SAVED, { ...SAVED, status: 'watched' }).finished).toBe(true);
    const watched = { ...SAVED, status: 'watched' as const };
    expect(diffReview(watched, { ...watched, rating: 5 }).finished).toBe(false);
  });

  it('separa las listas y calificadores agregados de los quitados', () => {
    const changes = diffReview(SAVED, { ...SAVED, listIds: [2, 3], reactionIds: [8] });
    expect(changes.addedListIds).toEqual([3]);
    expect(changes.removedListIds).toEqual([1]);
    expect(changes.reactions).toEqual([
      { reactionId: 8, selected: true },
      { reactionId: 7, selected: false },
    ]);
    expect(changes.fields).toEqual({});
    expect(hasChanges(changes)).toBe(true);
  });

  it('sin estado las listas se guardan igual, pero no hay fila de seguimiento', () => {
    const changes = diffReview(EMPTY_REVIEW, { ...EMPTY_REVIEW, listIds: [4] });
    expect(changes.fields).toEqual({});
    expect(changes.addedListIds).toEqual([4]);
  });
});

describe('rebaseDraft', () => {
  const reloaded: ReviewDraft = { status: 'watched', rating: 2, notes: 'del servidor', listIds: [5], reactionIds: [] };

  it('lo que no se tocó toma el valor recargado', () => {
    expect(rebaseDraft(SAVED, SAVED, reloaded)).toEqual(reloaded);
  });

  it('lo que se editó se queda como estaba', () => {
    const draft = { ...SAVED, notes: 'escribiendo…', listIds: [1] };
    expect(rebaseDraft(SAVED, draft, reloaded)).toEqual({ ...reloaded, notes: 'escribiendo…', listIds: [1] });
  });
});

describe('toggleId y setMembership', () => {
  it('agrega o quita el id', () => {
    expect(toggleId([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleId([1, 2], 1)).toEqual([2]);
  });

  it('setMembership no duplica ni falla si ya estaba como se pide', () => {
    expect(setMembership([1, 2], 2, true)).toEqual([1, 2]);
    expect(setMembership([1], 5, false)).toEqual([1]);
  });
});
