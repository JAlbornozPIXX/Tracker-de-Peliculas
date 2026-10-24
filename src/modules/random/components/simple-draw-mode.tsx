import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { ChipOption, Chips, ToggleChips } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import { getLists, ListSummary } from '@/modules/lists/api/lists';
import { getAllMovies, type MovieRow } from '@/modules/movies/api/movies';
import { getGenreDrawCandidates, getListDrawCandidates } from '@/modules/random/api/random';
import { DrawResult, drawStyles, PrimaryButton } from '@/modules/random/components/draw-result';
import { useDraw } from '@/modules/random/hooks/use-draw';
import { filterByGenres, genresOf } from '@/modules/random/utils/roulette';

type Source = 'list' | 'genres';

const SOURCE_OPTIONS: ChipOption<Source>[] = [
  { key: 'list', label: 'Una lista' },
  { key: 'genres', label: 'Géneros' },
];

const MAX_GENRES = 2;

function countLabel(count: number): string {
  return count === 1 ? '1 película' : `${count} películas`;
}

// Sorteo simple: una película al azar de una lista o de 1–2 géneros.
export function SimpleDrawMode({ userId }: { userId: string }) {
  const router = useRouter();
  const draw = useDraw();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [catalog, setCatalog] = useState<MovieRow[]>([]);
  const [source, setSource] = useState<Source>('list');
  const [listId, setListId] = useState<number | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  // Origen del último sorteo: al cambiarlo, lo ya sugerido vuelve a contar.
  const lastSourceKey = useRef<string | null>(null);

  // Se recarga al volver de Listas o de Descubre, donde cambian listas y catálogo.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getLists(userId), getAllMovies()])
        .then(([listData, catalogData]) => {
          if (!active) return;
          setLists(listData);
          setCatalog(catalogData);
        })
        .catch((err) => Alert.alert('No se pudo cargar tu catálogo', err instanceof Error ? err.message : ''));
      return () => {
        active = false;
      };
    }, [userId])
  );

  // Solo se ofrecen géneros que tiene alguna película del catálogo.
  const genres = useMemo(() => genresOf(catalog), [catalog]);
  const genreMatches = useMemo(() => filterByGenres(catalog, selectedGenres).length, [catalog, selectedGenres]);

  const listName = lists.find((list) => list.id === listId)?.name ?? 'la lista';
  const genresLabel = selectedGenres.join(' + ');
  const ready = source === 'list' ? listId != null : selectedGenres.length > 0;

  function start() {
    const sourceKey = source === 'list' ? `list:${listId}` : `genres:${[...selectedGenres].sort().join('+')}`;
    const resetSeen = sourceKey !== lastSourceKey.current;
    lastSourceKey.current = sourceKey;

    if (source === 'list' && listId != null) {
      draw.draw(() => getListDrawCandidates(listId), 'No se pudo hacer el sorteo', resetSeen);
    } else if (source === 'genres') {
      draw.draw(() => getGenreDrawCandidates(selectedGenres), 'No se pudo hacer el sorteo', resetSeen);
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
            <EmptyNotice title="Sin coincidencias" copy={`Ninguna película del catálogo es ${genresLabel} a la vez.`} />
          )
        }
      />
    );
  }

  return (
    <View>
      <Text style={drawStyles.intro}>Saca una película al azar de una de tus listas o de una combinación de géneros.</Text>
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
          {genres.length > 0 ? (
            <>
              <ToggleChips
                options={genres.map((genre) => ({ key: genre, label: genre }))}
                values={selectedGenres}
                onChange={setSelectedGenres}
                max={MAX_GENRES}
              />
              {selectedGenres.length > 0 && (
                <Text style={drawStyles.hint}>
                  {countLabel(genreMatches)} del catálogo
                  {selectedGenres.length > 1 ? ` son ${genresLabel} a la vez` : ` son ${genresLabel}`}.
                </Text>
              )}
            </>
          ) : (
            <EmptyNotice
              title="El catálogo está vacío"
              copy="Busca películas para agregarlas al catálogo y poder sortear por género."
              actionLabel="Buscar películas"
              onAction={() => router.push('/search')}
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
