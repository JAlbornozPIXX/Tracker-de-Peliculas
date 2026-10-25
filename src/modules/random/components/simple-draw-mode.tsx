import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ChipOption, Chips, ToggleChips } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import { getLists, ListSummary } from '@/modules/lists/api/lists';
import { discoverMovies, type Genre } from '@/modules/movies/api/tmdb';
import { listDrawSource, tmdbDrawSource } from '@/modules/random/api/random';
import { DrawResult, drawStyles, PrimaryButton } from '@/modules/random/components/draw-result';
import { useDraw } from '@/modules/random/hooks/use-draw';
import { poolSizeLabel } from '@/modules/random/utils/roulette';
import { errorMessage, showAlert } from '@/utils/alert';

type Source = 'list' | 'genres';

const SOURCE_OPTIONS: ChipOption<Source>[] = [
  { key: 'list', label: 'Una lista' },
  { key: 'genres', label: 'Géneros' },
];

const MAX_GENRES = 2;

// Sorteo simple: una película al azar de una lista o, por 1–2 géneros, de
// todas las de TheMovieDB. genres es null mientras se cargan.
export function SimpleDrawMode({ userId, genres }: { userId: string; genres: Genre[] | null }) {
  const router = useRouter();
  const draw = useDraw();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [source, setSource] = useState<Source>('list');
  const [listId, setListId] = useState<number | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  // Total de TheMovieDB para la combinación de géneros elegida.
  const [genreTotal, setGenreTotal] = useState<{ key: string; total: number } | null>(null);
  // Origen del último sorteo: al cambiarlo, lo ya sugerido vuelve a contar.
  const lastSourceKey = useRef<string | null>(null);

  // Se recarga al volver de Listas, donde cambian las listas.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getLists(userId)
        .then((listData) => {
          if (active) setLists(listData);
        })
        .catch((err) => showAlert('No se pudieron cargar tus listas', errorMessage(err)));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const genresKey = [...selectedGenres].sort((a, b) => a - b).join('+');

  useEffect(() => {
    if (!genresKey) return;
    const controller = new AbortController();
    const genreIds = genresKey.split('+').map(Number);
    discoverMovies({ genreIds, maxDurationMinutes: null }, 1, controller.signal)
      .then((page) => setGenreTotal({ key: genresKey, total: page.totalResults }))
      .catch(() => {
        // Sin el total el sorteo funciona igual; solo no se muestra el aviso.
      });
    return () => controller.abort();
  }, [genresKey]);

  const listName = lists.find((list) => list.id === listId)?.name ?? 'la lista';
  const genresLabel = (genres ?? [])
    .filter((genre) => selectedGenres.includes(genre.id))
    .map((genre) => genre.name)
    .join(' + ');
  const ready = source === 'list' ? listId != null : selectedGenres.length > 0;
  const shownTotal = genreTotal?.key === genresKey ? genreTotal.total : null;

  function start() {
    const sourceKey = source === 'list' ? `list:${listId}` : `genres:${genresKey}`;
    const resetSeen = sourceKey !== lastSourceKey.current;
    lastSourceKey.current = sourceKey;

    if (source === 'list' && listId != null) {
      draw.draw(() => listDrawSource(listId), 'No se pudo hacer el sorteo', resetSeen);
    } else if (source === 'genres') {
      const filters = { genreIds: selectedGenres, maxDurationMinutes: null };
      draw.draw(() => tmdbDrawSource(userId, filters), 'No se pudo hacer el sorteo', resetSeen);
    }
  }

  if (draw.phase !== 'setup') {
    return (
      <DrawResult
        draw={draw}
        loadingText="Sorteando…"
        againLabel="Sortear de nuevo"
        changeLabel="Cambiar origen"
        exhaustedCopy={`Ya salieron todas las películas de ${source === 'list' ? listName : genresLabel}.`}
        empty={
          source === 'list' ? (
            <EmptyNotice
              title="La lista está vacía"
              copy={`Agrega películas a ${listName} para poder sortear entre ellas.`}
              actionLabel="Ir a Listas"
              onAction={() => router.push('/lists')}
            />
          ) : (
            <EmptyNotice title="Sin coincidencias" copy={`Ninguna película de TheMovieDB es ${genresLabel} a la vez.`} />
          )
        }
      />
    );
  }

  return (
    <View>
      <Text style={drawStyles.intro}>
        Saca una película al azar de una de tus listas o de todas las de TheMovieDB con los géneros que elijas.
      </Text>
      <View style={drawStyles.group}>
        <Text style={drawStyles.label}>Sortear desde</Text>
        <Chips options={SOURCE_OPTIONS} value={source} onChange={setSource} />
      </View>

      {source === 'list' ? (
        <View style={drawStyles.group}>
          <Text style={drawStyles.label}>Lista</Text>
          {lists.length > 0 ? (
            <Chips
              options={lists.map((list) => ({ key: list.id, label: `${list.name} · ${list.movieCount}` }))}
              value={listId}
              onChange={setListId}
              scroll
            />
          ) : (
            <EmptyNotice
              title="Todavía no tienes listas"
              copy="Crea una lista o playlist para sortear entre sus películas."
              actionLabel="Ir a Listas"
              onAction={() => router.push('/lists')}
            />
          )}
        </View>
      ) : (
        <View style={drawStyles.group}>
          <Text style={drawStyles.label}>Géneros (hasta {MAX_GENRES})</Text>
          {genres == null ? (
            <Text style={drawStyles.hint}>Cargando géneros…</Text>
          ) : genres.length > 0 ? (
            <>
              <ToggleChips
                options={genres.map((genre) => ({ key: genre.id, label: genre.name }))}
                values={selectedGenres}
                onChange={setSelectedGenres}
                max={MAX_GENRES}
              />
              {selectedGenres.length > 0 && shownTotal != null && (
                <Text style={drawStyles.hint}>
                  {poolSizeLabel(shownTotal)} en TheMovieDB
                  {selectedGenres.length > 1 ? ` son ${genresLabel} a la vez` : ` son de ${genresLabel}`}.
                </Text>
              )}
            </>
          ) : (
            <EmptyNotice
              title="No se pudieron cargar los géneros"
              copy="Revisa tu conexión y vuelve a abrir el sorteo para elegir géneros de TheMovieDB."
            />
          )}
        </View>
      )}

      <View style={drawStyles.submit}>
        <PrimaryButton label="Sortear" onPress={start} disabled={!ready} />
      </View>
    </View>
  );
}
