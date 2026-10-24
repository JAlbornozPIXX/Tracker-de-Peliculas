import { fromDateString, toLocalDateString } from '@/modules/movies/utils/view-date';

// Se guarda tal cual en challenges.filter (jsonb). Vacío = cuentan todas las vistas.
export type ChallengeFilter = { genre?: string; list_id?: number };

export type Challenge = {
  id: number;
  title: string;
  targetCount: number;
  filter: ChallengeFilter;
  // 'YYYY-MM-DD', ambos inclusive.
  startsOn: string;
  endsOn: string;
};

export type ChallengeView = { movieId: number; viewedOn: string; genres: string[] };

export type ChallengeStatus = 'active' | 'completed' | 'expired';

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  active: 'En curso',
  completed: 'Cumplido',
  expired: 'Vencido',
};

export const CHALLENGE_TITLE_MAX = 60;

export type ChallengeDraft = {
  title: string;
  target: string;
  startsOn: string;
  endsOn: string;
};

// Devuelve el mensaje para el usuario, o null si el reto es válido.
export function validateChallenge(draft: ChallengeDraft): string | null {
  if (draft.title.trim().length === 0) return 'Ponle un nombre al reto.';

  const target = Number(draft.target.trim());
  if (draft.target.trim() === '' || !Number.isFinite(target)) return 'La meta debe ser un número.';
  if (target <= 0) return 'La meta debe ser de al menos 1 película.';
  if (!Number.isInteger(target)) return 'La meta debe ser un número entero de películas.';

  if (draft.endsOn < draft.startsOn) return 'La fecha de término no puede ser anterior a la de inicio.';
  return null;
}

// El nuevo término tiene que alargar el plazo y no quedar en el pasado.
export function validateExtension(challenge: Challenge, newEndsOn: string, today: string): string | null {
  if (newEndsOn <= challenge.endsOn) return 'La nueva fecha debe ser posterior al término actual.';
  if (newEndsOn < today) return 'La nueva fecha no puede estar en el pasado.';
  return null;
}

/**
 * Vistas que suman al reto: dentro de las fechas y, si hay filtro, del género
 * o de la lista. Cada vista cuenta, también los reestrenos de una película.
 */
export function countChallengeViews(
  challenge: Challenge,
  views: ChallengeView[],
  listMovieIds: Map<number, number[]>
): number {
  const { genre, list_id: listId } = challenge.filter;
  const inList = listId != null ? new Set(listMovieIds.get(listId) ?? []) : null;

  return views.filter(
    (view) =>
      view.viewedOn >= challenge.startsOn &&
      view.viewedOn <= challenge.endsOn &&
      (genre == null || view.genres.includes(genre)) &&
      (inList == null || inList.has(view.movieId))
  ).length;
}

// Cumplido gana aunque el plazo ya haya pasado.
export function challengeStatus(challenge: Challenge, count: number, today: string): ChallengeStatus {
  if (count >= challenge.targetCount) return 'completed';
  if (today > challenge.endsOn) return 'expired';
  return 'active';
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(from: string, to: string): number {
  return Math.round((fromDateString(to).getTime() - fromDateString(from).getTime()) / DAY_MS);
}

export function addDays(day: string, amount: number): string {
  const date = fromDateString(day);
  date.setDate(date.getDate() + amount);
  return toLocalDateString(date);
}

export function monthRange(today: string): { startsOn: string; endsOn: string } {
  const date = fromDateString(today);
  return {
    startsOn: toLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1, 12)),
    // El día 0 del mes siguiente es el último de este.
    endsOn: toLocalDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12)),
  };
}

export function yearRange(today: string): { startsOn: string; endsOn: string } {
  const year = today.slice(0, 4);
  return { startsOn: `${year}-01-01`, endsOn: `${year}-12-31` };
}
