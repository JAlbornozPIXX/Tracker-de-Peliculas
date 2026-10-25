import { useRef, useState } from 'react';

import { errorMessage, showAlert } from '@/utils/alert';

// setup: eligiendo filtros u origen; empty: no hay candidatas; exhausted: ya
// salieron todas las candidatas en esta sesión.
export type DrawPhase = 'setup' | 'loading' | 'suggestion' | 'empty' | 'exhausted';

export type DrawSuggestion = {
  // Identifica el título entre sorteos: 'movie:<id interno>' o 'tmdb:<id>'.
  key: string;
  title: string;
  overview: string | null;
  posterUrl: string | null;
  year: string | null;
  durationMinutes: number | null;
  genres: string[];
  // Parámetros de la ficha: con mediaType el id es de TheMovieDB.
  detail: { id: string; mediaType?: 'movie' };
};

export type DrawPick = { kind: 'picked'; suggestion: DrawSuggestion } | { kind: 'empty' } | { kind: 'exhausted' };

// De dónde sale cada sugerencia (una lista, TheMovieDB). seen son las
// sugeridas en la sesión, que no deben repetirse.
export type DrawSource = { next: (seen: ReadonlySet<string>) => Promise<DrawPick> };

type LastDraw = { create: () => DrawSource; source: DrawSource; errorTitle: string };

/**
 * Estado de un sorteo sin repetición: los títulos ya sugeridos no vuelven
 * a salir mientras la pantalla siga abierta.
 */
export function useDraw() {
  const [phase, setPhase] = useState<DrawPhase>('setup');
  const [current, setCurrent] = useState<DrawSuggestion | null>(null);
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set());
  const lastDraw = useRef<LastDraw | null>(null);

  async function suggest(source: DrawSource, seen: Set<string>, errorTitle: string) {
    setPhase('loading');
    try {
      const pick = await source.next(seen);
      if (pick.kind !== 'picked') {
        setCurrent(null);
        setPhase(pick.kind);
        return;
      }
      setCurrent(pick.suggestion);
      setSeenKeys(new Set(seen).add(pick.suggestion.key));
      setPhase('suggestion');
    } catch (err) {
      showAlert(errorTitle, errorMessage(err));
      setPhase('setup');
    }
  }

  // Con resetSeen se olvida lo ya sugerido, p. ej. al cambiar el origen del sorteo.
  function draw(create: () => DrawSource, errorTitle: string, resetSeen = false) {
    const source = create();
    lastDraw.current = { create, source, errorTitle };
    suggest(source, resetSeen ? new Set() : seenKeys, errorTitle);
  }

  return {
    phase,
    current,
    draw,
    drawAgain: () => {
      if (lastDraw.current) suggest(lastDraw.current.source, seenKeys, lastDraw.current.errorTitle);
    },
    // Empieza de nuevo con una fuente nueva: desde "Ver ficha" se pudo marcar
    // Terminada o Abandonada alguna de las ya sugeridas.
    restart: () => {
      if (lastDraw.current) draw(lastDraw.current.create, lastDraw.current.errorTitle, true);
    },
    backToSetup: () => setPhase('setup'),
  };
}
