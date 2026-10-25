import { useEffect, useState } from 'react';

import { useWriteTracker } from '@/hooks/use-write-tracker';
import { addView, deleteView, getViews, sortViews, ViewEntry } from '@/modules/movies/api/views';
import { toLocalDateString } from '@/modules/movies/utils/view-date';
import { saveAutoView, syncQueue } from '@/modules/sync/queue';

// days: días con vista automática pendiente en el teléfono. uploaded: los que
// dejaron de estar pendientes y todavía no llegan en una recarga.
type PendingDays = { days: string[]; uploaded: string[] };

function readPendingDays(movieId: number | null): string[] {
  return movieId == null ? [] : syncQueue.pendingAutoViewDates(movieId);
}

/**
 * Vistas del usuario para una película. movieId es el id interno de movies,
 * o null mientras el título de TheMovieDB todavía no existe ahí; las
 * funciones de escritura reciben el id ya resuelto. Incluye, marcadas como
 * pendientes, las vistas automáticas que se guardaron sin red.
 */
export function useMovieViews(userId: string | undefined, movieId: number | null) {
  const [views, setViews] = useState<ViewEntry[]>([]);
  // Cambia para volver a leer del servidor después de subir una vista.
  const [reloadKey, setReloadKey] = useState(0);
  // Una carga que se cruza con una escritura puede llegar sin esa fila, o con
  // ella y la escritura la agregaría otra vez: se descarta.
  const writes = useWriteTracker();
  const [pending, setPending] = useState<PendingDays>(() => ({ days: readPendingDays(movieId), uploaded: [] }));

  // Un día que se sube sale de la cola antes de que la recarga traiga su fila:
  // se sigue mostrando hasta entonces, para que la lista no parpadee y la
  // ficha no salte. Días y subidos cambian en la misma actualización.
  useEffect(() => {
    return syncQueue.subscribe(() => {
      const days = readPendingDays(movieId);
      setPending((current) => {
        if (days.join(',') === current.days.join(',')) return current;
        const gone = current.days.filter((day) => !days.includes(day) && !current.uploaded.includes(day));
        return { days, uploaded: [...current.uploaded, ...gone] };
      });
    });
  }, [movieId]);

  // Cuando una vista pendiente se sube, se vuelve a leer para mostrarla con
  // su id real. Si se cruza con una escritura, se repite al terminar. Sin
  // vistas cargadas la ficha sigue siendo usable; la próxima escritura
  // mostrará el error si el problema persiste.
  const pendingKey = pending.days.join(',');
  useEffect(() => {
    if (!userId || movieId == null) return;
    return writes.loadWhenIdle(
      () => getViews(userId, movieId),
      (rows) => {
        setViews(rows);
        setPending((current) => (current.uploaded.length === 0 ? current : { ...current, uploaded: [] }));
      }
    );
  }, [userId, movieId, pendingKey, reloadKey, writes]);

  async function registerView(resolvedMovieId: number, viewedOn: string) {
    if (!userId) return;
    const view = await writes.track(() => addView(userId, resolvedMovieId, viewedOn));
    setViews((current) => sortViews([...current, view]));
  }

  // Al pasar a Terminado. Pasa por la cola: sin red queda pendiente y se sube
  // después. Si ese día ya hay una vista (manual o automática) el servidor no
  // suma otra.
  async function registerAutoViewToday(resolvedMovieId: number) {
    if (!userId) return;
    const result = await writes.track(() => saveAutoView(userId, resolvedMovieId, toLocalDateString(new Date())));
    if (result === 'saved') setReloadKey((key) => key + 1);
  }

  async function removeView(viewId: number) {
    const { error } = await writes.track(async () => deleteView(viewId));
    if (error) throw error;
    setViews((current) => current.filter((view) => view.id !== viewId));
  }

  // Una pendiente no se muestra si ese día ya hay una vista: al subirla, el
  // servidor tampoco la agregará.
  const pendingViews = [...pending.days, ...pending.uploaded.filter((day) => !pending.days.includes(day))]
    .filter((day) => !views.some((view) => view.viewedOn === day))
    .map((day, index): ViewEntry => ({ id: -(index + 1), viewedOn: day, source: 'auto', pending: true }));
  const shownViews = pendingViews.length === 0 ? views : sortViews([...views, ...pendingViews]);

  return { views: shownViews, registerView, registerAutoViewToday, removeView };
}
