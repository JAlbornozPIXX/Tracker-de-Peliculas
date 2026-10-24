/**
 * Baraja del repaso: la tarjeta de arriba es cards[0]. Al resolverla sale de
 * la baraja; "Deshacer" la devuelve arriba, donde estaba.
 */
export function takeTop<T>(cards: readonly T[]): T[] {
  return cards.slice(1);
}

export function putBack<T>(cards: readonly T[], card: T): T[] {
  return [card, ...cards];
}

// Terminada: ya no quedan tarjetas y no hay un borrado que se pueda deshacer.
export function isDeckDone(cards: readonly unknown[], undoPending: boolean): boolean {
  return cards.length === 0 && !undoPending;
}
