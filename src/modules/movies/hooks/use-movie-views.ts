import { useEffect, useState, useSyncExternalStore } from 'react';

import { useWriteTracker } from '@/hooks/use-write-tracker';
import { addView, deleteView, getViews, sortViews, ViewEntry } from '@/modules/movies/api/views';
import { toLocalDateString } from '@/modules/movies/utils/view-date';
import { saveAutoView, syncQueue } from '@/modules/sync/queue';

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
  // Días con vista automática pendiente, como texto para que
  // useSyncExternalStore compare por valor.
  const getPendingDays = () => (movieId == null ? '' : syncQueue.pendingAutoViewDates(movieId).join(','));
  const pendingDays = useSyncExternalStore(syncQueue.subscribe, getPendingDays, getPendingDays);

  // pendingDays: cuando una vista pendiente se sube, se vuelve a leer para
  // mostrarla con su id real. Si se cruza con una escritura, se repite al
  // terminar. Sin vistas cargadas la ficha sigue siendo usable; la próxima
  // escritura mostrará el error si el problema persiste.
  useEffect(() => {
    if (!userId || movieId == null) return;
    return writes.loadWhenIdle(() => getViews(userId, movieId), setViews);
  }, [userId, movieId, pendingDays, reloadKey, writes]);

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
  const pendingViews = (pendingDays ? pendingDays.split(',') : [])
    .filter((day) => !views.some((view) => view.viewedOn === day))
    .map((day, index): ViewEntry => ({ id: -(index + 1), viewedOn: day, source: 'auto', pending: true }));
  const shownViews = pendingViews.length === 0 ? views : sortViews([...views, ...pendingViews]);

  return { views: shownViews, registerView, registerAutoViewToday, removeView };
}
