import type { StatusKey } from '@/modules/movies/constants/status';

// Una película entra a la pila al cumplir 180 días en "Ver más tarde".
export const SHAME_MIN_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

// Días completos transcurridos desde changedAt (ISO) hasta now.
export function daysSince(changedAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(changedAt).getTime()) / DAY_MS);
}

// Fecha límite: lo que cambió de estado antes de esto ya lleva 180 días.
export function shameCutoff(now: Date): Date {
  return new Date(now.getTime() - SHAME_MIN_DAYS * DAY_MS);
}

export type WatchlistRow = {
  status: StatusKey;
  // Cuándo se puso el estado actual; no cambia al editar nota ni estrellas.
  statusChangedAt: string;
};

export function isInShamePile(row: WatchlistRow, now: Date): boolean {
  return row.status === 'watchlist' && daysSince(row.statusChangedAt, now) >= SHAME_MIN_DAYS;
}

/** Filas de la pila con sus días en espera, de la más antigua a la más nueva. */
export function shamePile<T extends WatchlistRow>(rows: readonly T[], now: Date): (T & { days: number })[] {
  return rows
    .filter((row) => isInShamePile(row, now))
    .map((row) => ({ ...row, days: daysSince(row.statusChangedAt, now) }))
    .sort((a, b) => b.days - a.days);
}

export function formatDays(days: number): string {
  return days === 1 ? '1 día' : `${days} días`;
}
