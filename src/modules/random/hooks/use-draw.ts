import { useRef, useState } from 'react';

import type { MovieRow } from '@/modules/movies/api/movies';
import { pickRandom } from '@/modules/random/utils/roulette';
import { errorMessage, showAlert } from '@/utils/alert';

// setup: eligiendo filtros u origen; empty: no hay candidatas; exhausted: ya
// salieron todas las candidatas en esta sesión.
export type DrawPhase = 'setup' | 'loading' | 'suggestion' | 'empty' | 'exhausted';

type DrawSource = { load: () => Promise<MovieRow[]>; errorTitle: string };

/**
 * Estado de un sorteo sin repetición: las películas ya sugeridas no vuelven
 * a salir mientras la pantalla siga abierta.
 */
export function useDraw() {
  const [phase, setPhase] = useState<DrawPhase>('setup');
  const [candidates, setCandidates] = useState<MovieRow[]>([]);
  const [current, setCurrent] = useState<MovieRow | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const lastSource = useRef<DrawSource | null>(null);

  function suggest(pool: MovieRow[], seen: Set<number>) {
    const picked = pickRandom(pool, seen);
    setCurrent(picked);
    if (!picked) {
      setPhase(pool.length === 0 ? 'empty' : 'exhausted');
      return;
    }
    setSeenIds(new Set(seen).add(picked.id));
    setPhase('suggestion');
  }

  // Con resetSeen se olvida lo ya sugerido, p. ej. al cambiar el origen del sorteo.
  async function draw(loadCandidates: () => Promise<MovieRow[]>, errorTitle: string, resetSeen = false) {
    lastSource.current = { load: loadCandidates, errorTitle };
    setPhase('loading');
    try {
      const pool = await loadCandidates();
      setCandidates(pool);
      suggest(pool, resetSeen ? new Set() : seenIds);
    } catch (err) {
      showAlert(errorTitle, errorMessage(err));
      setPhase('setup');
    }
  }

  return {
    phase,
    current,
    draw,
    drawAgain: () => suggest(candidates, seenIds),
    // Vuelve a consultar las candidatas: desde "Ver ficha" se pudo marcar
    // Terminada o Abandonada alguna de las ya sugeridas.
    restart: () => {
      if (lastSource.current) draw(lastSource.current.load, lastSource.current.errorTitle, true);
    },
    backToSetup: () => setPhase('setup'),
  };
}
