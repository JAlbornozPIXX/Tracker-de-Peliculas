/**
 * Letra para la portada de reemplazo: el primer carácter alfanumérico del
 * título, así "¡Canta!" muestra C y no ¡. Sin ninguno, el primer carácter.
 */
export function posterInitial(title: string): string {
  const match = title.match(/[\p{L}\p{N}]/u);
  return (match?.[0] ?? title.trim().charAt(0)).toUpperCase();
}
