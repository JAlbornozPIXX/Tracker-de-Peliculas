import { useState } from 'react';
import { Alert } from 'react-native';

import type { MovieRow } from '@/modules/movies/api/movies';
import { pickRandom } from '@/modules/random/utils/roulette';

// setup: eligiendo filtros u origen; empty: no hay candidatas; exhausted: ya
// salieron todas las candidatas en esta sesión.
export type DrawPhase = 'setup' | 'loading' | 'suggestion' | 'empty' | 'exhausted';

/**
 * Estado de un sorteo sin repetición: las películas ya sugeridas no vuelven
 * a salir mientras la pantalla siga abierta.
 */
export function useDraw() {
  const [phase, setPhase] = useState<DrawPhase>('setup');
  const [candidates, setCandidates] = useState<MovieRow[]>([]);
  const [current, setCurrent] = useState<MovieRow | null>(null);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

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
    setPhase('loading');
    try {
      const pool = await loadCandidates();
      setCandidates(pool);
      suggest(pool, resetSeen ? new Set() : seenIds);
    } catch (err) {
      Alert.alert(errorTitle, err instanceof Error ? err.message : '');
      setPhase('setup');
    }
  }

  return {
    phase,
    current,
    draw,
    drawAgain: () => suggest(candidates, seenIds),
    restart: () => suggest(candidates, new Set()),
    backToSetup: () => setPhase('setup'),
  };
}
