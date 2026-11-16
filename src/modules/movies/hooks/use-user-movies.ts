import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { getTrackedMovies, type TrackedMovie } from '@/modules/movies/api/user-movies';
import type { StatusKey } from '@/modules/movies/constants/status';
import { moviesWithStatus, ratingsByMovie } from '@/modules/movies/utils/home-sections';

/**
 * El seguimiento del usuario (RLS: solo sus filas), recargado cada vez que la
 * pantalla vuelve a verse: así un estado cambiado en la ficha se refleja al
 * volver. Sin red queda lo último cargado y failed lo avisa.
 */
export function useUserMovies(userId: string | undefined) {
  const [tracked, setTracked] = useState<TrackedMovie[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      getTrackedMovies(userId)
        .then((rows) => {
          if (!active) return;
          setTracked(rows);
          setFailed(false);
        })
        .catch(() => active && setFailed(true))
        .finally(() => active && setLoaded(true));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const byStatus = useCallback((status: StatusKey) => moviesWithStatus(tracked, status), [tracked]);
  const ratings = useMemo(() => ratingsByMovie(tracked), [tracked]);

  return { tracked, byStatus, ratings, loaded, failed };
}
