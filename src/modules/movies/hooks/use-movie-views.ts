import { useEffect, useRef, useState } from 'react';

import { addAutoView, addView, deleteView, getViews, sortViews, ViewEntry } from '@/modules/movies/api/views';
import { toLocalDateString } from '@/modules/movies/utils/view-date';

/**
 * Vistas del usuario para una película. movieId es el id interno de movies,
 * o null mientras el título de TheMovieDB todavía no existe ahí; las
 * funciones de escritura reciben el id ya resuelto.
 */
export function useMovieViews(userId: string | undefined, movieId: number | null) {
  const [views, setViews] = useState<ViewEntry[]>([]);
  // Una carga que empezó antes de una escritura llega sin esa fila: se descarta.
  const writeCount = useRef(0);

  useEffect(() => {
    if (!userId || movieId == null) return;
    let active = true;
    const writesAtStart = writeCount.current;
    getViews(userId, movieId)
      .then((rows) => {
        if (active && writeCount.current === writesAtStart) setViews(rows);
      })
      .catch(() => {
        // Sin vistas cargadas la ficha sigue siendo usable; la próxima
        // escritura mostrará el error si el problema persiste.
      });
    return () => {
      active = false;
    };
  }, [userId, movieId]);

  async function registerView(resolvedMovieId: number, viewedOn: string) {
    if (!userId) return;
    writeCount.current += 1;
    const view = await addView(userId, resolvedMovieId, viewedOn);
    setViews((current) => sortViews([...current, view]));
  }

  // Al pasar a Terminado. Si ya hay una vista hoy (manual o automática) no
  // suma otra; el índice único parcial cubre los toques dobles. Se consulta
  // la base y no el estado: la carga inicial puede no haber llegado todavía.
  async function registerAutoViewToday(resolvedMovieId: number) {
    if (!userId) return;
    const today = toLocalDateString(new Date());
    writeCount.current += 1;
    const rows = await getViews(userId, resolvedMovieId);
    const view = rows.some((row) => row.viewedOn === today)
      ? null
      : await addAutoView(userId, resolvedMovieId, today);
    const fresh = view ? [...rows, view] : rows;
    // Se conserva lo que otra escritura en paralelo ya agregó al estado.
    setViews((current) =>
      sortViews([...fresh, ...current.filter((entry) => !fresh.some((row) => row.id === entry.id))]),
    );
  }

  async function removeView(viewId: number) {
    writeCount.current += 1;
    const { error } = await deleteView(viewId);
    if (error) throw error;
    setViews((current) => current.filter((view) => view.id !== viewId));
  }

  return { views, registerView, registerAutoViewToday, removeView };
}
