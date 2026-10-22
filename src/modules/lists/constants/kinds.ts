// Secciones de la zona 1, en el orden de las pestañas de Listas.
export const LIST_KINDS = [
  { key: 'category', label: 'Categoría' },
  { key: 'folder', label: 'Carpeta' },
  { key: 'playlist', label: 'Playlist' },
  { key: 'collection', label: 'Colección' },
] as const;

export type ListKind = (typeof LIST_KINDS)[number]['key'];

export const DEFAULT_LIST_KIND: ListKind = 'folder';

// Se ven en el orden de list_movies.position, con barra de avance.
export const ORDERED_LIST_KINDS: ListKind[] = ['playlist', 'collection'];

export function listKindLabel(kind: ListKind): string {
  return LIST_KINDS.find((item) => item.key === kind)?.label ?? '';
}

export function isOrderedKind(kind: ListKind): boolean {
  return ORDERED_LIST_KINDS.includes(kind);
}
