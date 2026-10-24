// Fechas de vistas como 'YYYY-MM-DD' en el día local del usuario. No usar
// toISOString().slice(0, 10): esa es la fecha en UTC y de noche en Chile ya
// es el día siguiente.

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Mediodía local: lejos de la medianoche, así ningún cambio de zona u horario
// de verano mueve el día al convertirlo.
export function fromDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function formatViewDate(value: string): string {
  return fromDateString(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatViewCount(count: number): string {
  return count === 1 ? 'Vista 1 vez' : `Vista ${count} veces`;
}
