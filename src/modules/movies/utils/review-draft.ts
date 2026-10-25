import type { UserMovieFields } from '@/modules/movies/api/user-movies';
import type { StatusKey } from '@/modules/movies/constants/status';

/**
 * Lo que el usuario edita en la ficha de un título. Nada se guarda hasta
 * tocar Guardar: la ficha compara este borrador con lo último guardado.
 */
export type ReviewDraft = {
  status: StatusKey | null;
  rating: number | null;
  notes: string;
  listIds: number[];
  reactionIds: number[];
};

export type ReviewChanges = {
  // Campos de user_movies que cambiaron; la nota vacía se guarda como null.
  fields: UserMovieFields;
  // Pasó a Terminado: se registra la vista de hoy.
  finished: boolean;
  addedListIds: number[];
  removedListIds: number[];
  reactions: { reactionId: number; selected: boolean }[];
};

export const EMPTY_REVIEW: ReviewDraft = { status: null, rating: null, notes: '', listIds: [], reactionIds: [] };

export function setMembership(ids: readonly number[], id: number, member: boolean): number[] {
  const others = ids.filter((current) => current !== id);
  return member ? [...others, id] : others;
}

export function toggleId(ids: readonly number[], id: number): number[] {
  return setMembership(ids, id, !ids.includes(id));
}

function sameIds(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

// Calificar un título sin estado lo deja Terminado (A1).
export function rateDraft(draft: ReviewDraft, rating: number | null): ReviewDraft {
  return { ...draft, rating, status: draft.status ?? (rating == null ? null : 'watched') };
}

export function diffReview(saved: ReviewDraft, draft: ReviewDraft): ReviewChanges {
  const fields: UserMovieFields = {};
  // Sin estado no hay fila en user_movies: estrellas y nota necesitan uno.
  if (draft.status != null) {
    if (draft.status !== saved.status) fields.status = draft.status;
    if (draft.rating !== saved.rating) fields.rating = draft.rating;
    if (draft.notes !== saved.notes) fields.notes = draft.notes || null;
  }
  return {
    fields,
    finished: fields.status === 'watched',
    addedListIds: draft.listIds.filter((id) => !saved.listIds.includes(id)),
    removedListIds: saved.listIds.filter((id) => !draft.listIds.includes(id)),
    reactions: [
      ...draft.reactionIds
        .filter((id) => !saved.reactionIds.includes(id))
        .map((reactionId) => ({ reactionId, selected: true })),
      ...saved.reactionIds
        .filter((id) => !draft.reactionIds.includes(id))
        .map((reactionId) => ({ reactionId, selected: false })),
    ],
  };
}

export function hasChanges(changes: ReviewChanges): boolean {
  return (
    Object.keys(changes.fields).length > 0 ||
    changes.addedListIds.length > 0 ||
    changes.removedListIds.length > 0 ||
    changes.reactions.length > 0
  );
}

/**
 * Se volvió a leer lo guardado (el servidor descartó un cambio porque tenía
 * uno más nuevo): lo que el usuario no tocó toma el valor recargado y lo que
 * editó se queda como estaba.
 */
export function rebaseDraft(saved: ReviewDraft, draft: ReviewDraft, reloaded: ReviewDraft): ReviewDraft {
  return {
    status: draft.status === saved.status ? reloaded.status : draft.status,
    rating: draft.rating === saved.rating ? reloaded.rating : draft.rating,
    notes: draft.notes === saved.notes ? reloaded.notes : draft.notes,
    listIds: sameIds(draft.listIds, saved.listIds) ? reloaded.listIds : draft.listIds,
    reactionIds: sameIds(draft.reactionIds, saved.reactionIds) ? reloaded.reactionIds : draft.reactionIds,
  };
}
