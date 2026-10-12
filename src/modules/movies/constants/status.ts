export const STATUS_OPTIONS = [
  { key: 'watchlist', label: 'Ver más tarde' },
  { key: 'watching', label: 'Viendo' },
  { key: 'watched', label: 'Terminado' },
  { key: 'paused', label: 'Pausado' },
  { key: 'abandoned', label: 'Abandonado' },
] as const;

export type StatusKey = (typeof STATUS_OPTIONS)[number]['key'];

// RN-03: estos dos estados excluyen un título del Modo Ruleta.
export const UNSEEN_EXCLUDED_STATUSES: StatusKey[] = ['watched', 'abandoned'];
