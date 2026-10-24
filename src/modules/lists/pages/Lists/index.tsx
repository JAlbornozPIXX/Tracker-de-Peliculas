import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/bottom-bar';
import { Chips } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import { ProgressBar } from '@/components/progress-bar';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getListsWithMovies, getUserMoviesByGenre, ListWithMovies, MovieCardData } from '@/modules/lists/api/lists';
import { CreateListDialog } from '@/modules/lists/components/create-list-dialog';
import { ListOptions } from '@/modules/lists/components/list-options';
import { isOrderedKind, LIST_KINDS, ListKind, listKindLabel } from '@/modules/lists/constants/kinds';
import { sortListMovies } from '@/modules/lists/utils/list-order';
import { getDistinctGenres } from '@/modules/movies/api/movies';
import { getWatchedMovieIds } from '@/modules/movies/api/user-movies';
import { withPendingWatchedIds } from '@/modules/sync/queue';

const POSTER_WIDTH = 132;
const GRID_COLUMNS = 3;
const GRID_GAP = 12;
const CONTENT_PADDING = 16;

function PosterCard({ movie, width, onPress }: { movie: MovieCardData; width: number; onPress: () => void }) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={year ? `${movie.title}, ${year}` : movie.title}
      onPress={onPress}
      style={{ width }}>
      <View style={[styles.posterWrapper, { height: Math.round(width * 1.5) }]}>
        {movie.poster_url ? (
          <Image accessibilityIgnoresInvertColors source={{ uri: movie.poster_url }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterMark}>{movie.title.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={styles.movieTitle}>
        {movie.title}
      </Text>
      {year && <Text style={styles.movieYear}>{year}</Text>}
    </Pressable>
  );
}

export default function Lists() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<ListWithMovies[]>([]);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [genres, setGenres] = useState<string[]>([]);
  const [tab, setTab] = useState<ListKind>('folder');
  const [genre, setGenre] = useState<string | null>(null);
  // Resultado del último género consultado; si no coincide con genre, está cargando.
  const [genreResult, setGenreResult] = useState<{ genre: string; movies: MovieCardData[] } | null>(null);
  const [creating, setCreating] = useState(false);
  // Sube con cada foco para que la grilla de un género también se recargue.
  const [reloadKey, setReloadKey] = useState(0);

  // Se recarga al volver del detalle de una película o de una lista, donde
  // se pueden quitar títulos, cambiar su estado o eliminar la lista.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      setReloadKey((key) => key + 1);
      // Las Terminadas y los géneros son secundarios: si fallan, las listas se
      // muestran igual.
      Promise.all([
        getListsWithMovies(userId),
        getWatchedMovieIds(userId).catch(() => null),
        getDistinctGenres(userId).catch(() => null),
      ])
        .then(async ([listData, watched, genreData]) => {
          if (!active) return;
          setLists(listData);
          if (genreData) setGenres(genreData);
          if (!watched) return;
          // Los estados que aún no se suben (sin red o recién marcados en la
          // ficha) cuentan igual en las barras de avance.
          const listedIds = [...new Set(listData.flatMap((list) => list.movies.map((movie) => movie.id)))];
          const withPending = await withPendingWatchedIds(userId, listedIds, watched);
          if (active) setWatchedIds(withPending);
        })
        .catch((err) => Alert.alert('No se pudieron cargar tus listas', err instanceof Error ? err.message : ''))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [userId])
  );

  useEffect(() => {
    if (!userId || !genre) return;
    let active = true;
    getUserMoviesByGenre(userId, genre)
      .then((movies) => active && setGenreResult({ genre, movies }))
      .catch((err) => {
        if (!active) return;
        setGenreResult({ genre, movies: [] });
        Alert.alert('No se pudieron cargar las películas', err instanceof Error ? err.message : '');
      });
    return () => {
      active = false;
    };
  }, [userId, genre, reloadKey]);

  const visibleLists = lists.filter((list) => list.kind === tab);
  const showingGenre = tab === 'category' && genre != null;
  const genreMovies = genreResult != null && genreResult.genre === genre ? genreResult.movies : null;
  const gridWidth = Math.floor((screenWidth - CONTENT_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  function selectTab(next: ListKind) {
    setTab(next);
    setGenre(null);
  }

  // Lleva a otra sección con contenido: otra pestaña con listas o, si no
  // hay ninguna, los géneros de Categoría (sin elegir uno: podría estar vacío
  // y el botón volvería aquí). Desde un género vacío vuelve a las categorías,
  // y si tampoco hay nada ofrece crear una lista.
  function changeFilter() {
    if (showingGenre) {
      setGenre(null);
      return;
    }
    const other = LIST_KINDS.find((kind) => kind.key !== tab && lists.some((list) => list.kind === kind.key));
    if (other) {
      selectTab(other.key);
    } else if (tab !== 'category' && genres.length > 0) {
      selectTab('category');
    } else {
      setCreating(true);
    }
  }

  function openMovie(movieId: number) {
    router.push({ pathname: '/movie/[id]', params: { id: String(movieId) } });
  }

  function updateList(listId: number, change: (list: ListWithMovies) => ListWithMovies) {
    setLists((current) => current.map((item) => (item.id === listId ? change(item) : item)));
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  const hasOtherContent = lists.some((list) => list.kind !== tab) || (tab !== 'category' && genres.length > 0);
  const emptyKindLabel = listKindLabel(tab).toLowerCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mis listas</Text>
          <Text style={styles.count}>{lists.length === 1 ? '1 lista' : `${lists.length} listas`}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Crear lista"
          onPress={() => setCreating(true)}
          style={styles.newButton}>
          <Text style={styles.newButtonText}>+ Nueva</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Chips options={LIST_KINDS} value={tab} onChange={selectTab} scroll />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BOTTOM_BAR_SPACE }]}
        showsVerticalScrollIndicator={false}>
        {tab === 'category' && genres.length > 0 && (
          <View style={styles.genres}>
            <Text style={styles.groupLabel}>Géneros</Text>
            <Chips
              options={[{ key: null, label: 'Mis categorías' }, ...genres.map((g) => ({ key: g, label: g }))]}
              value={genre}
              onChange={setGenre}
              scroll
            />
          </View>
        )}

        {showingGenre ? (
          genreMovies == null ? (
            <ActivityIndicator color="#B94DFF" style={styles.inlineLoading} />
          ) : genreMovies.length > 0 ? (
            <View style={styles.grid}>
              {genreMovies.map((movie) => (
                <PosterCard key={movie.id} movie={movie} width={gridWidth} onPress={() => openMovie(movie.id)} />
              ))}
            </View>
          ) : (
            <EmptyNotice
              title="Sin resultados"
              copy={`No tienes películas de ${genre} en tu seguimiento ni en tus listas.`}
              actionLabel="Cambiar filtro"
              onAction={changeFilter}
            />
          )
        ) : visibleLists.length === 0 ? (
          <EmptyNotice
            title="Sin resultados"
            copy={`Todavía no tienes listas de tipo ${emptyKindLabel}. Crea una con “+ Nueva”.`}
            actionLabel={hasOtherContent ? 'Cambiar filtro' : 'Crear lista'}
            onAction={changeFilter}
          />
        ) : (
          visibleLists.map((list) => {
            const watched = list.movies.filter((movie) => watchedIds.has(movie.id)).length;
            return (
              <View key={list.id} style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir la lista ${list.name}`}
                    onPress={() => router.push({ pathname: '/list/[id]', params: { id: String(list.id) } })}
                    style={styles.sectionHeader}>
                    <Text numberOfLines={1} style={styles.sectionTitle}>
                      {list.name}
                    </Text>
                    <Text style={styles.sectionCount}>
                      {list.movies.length === 1 ? '1 título' : `${list.movies.length} títulos`} ›
                    </Text>
                  </Pressable>
                  <ListOptions
                    list={list}
                    compact
                    onRenamed={(name) => updateList(list.id, (item) => ({ ...item, name }))}
                    onKindChanged={(kind) =>
                      updateList(list.id, (item) => ({ ...item, kind, movies: sortListMovies(kind, item.movies) }))
                    }
                    onDeleted={() => setLists((current) => current.filter((item) => item.id !== list.id))}
                  />
                </View>

                {isOrderedKind(list.kind) && (
                  <View style={styles.progress}>
                    <ProgressBar done={watched} total={list.movies.length} label="Vistas" />
                  </View>
                )}

                {list.movies.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {list.movies.map((movie) => (
                      <PosterCard key={movie.id} movie={movie} width={POSTER_WIDTH} onPress={() => openMovie(movie.id)} />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyCopy}>Esta lista está vacía. Agrega títulos desde el detalle de cada película.</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {userId && creating && (
        <CreateListDialog
          userId={userId}
          initialKind={tab}
          onClose={() => setCreating(false)}
          onCreated={(list) => {
            setCreating(false);
            setLists((current) => [...current, { ...list, movies: [] }]);
            selectTab(list.kind);
          }}
        />
      )}

      <BottomBar active="lists" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  headerText: { flex: 1 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  count: { color: '#7D7382', fontSize: 12, marginTop: 2 },
  newButton: { height: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#A83BDD', alignItems: 'center', justifyContent: 'center' },
  newButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  tabs: { paddingHorizontal: CONTENT_PADDING, paddingBottom: 12 },
  content: { paddingHorizontal: CONTENT_PADDING, paddingTop: 6, paddingBottom: 48 },
  genres: { marginBottom: 20 },
  groupLabel: { color: '#D5D0D8', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  inlineLoading: { marginTop: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, rowGap: 18 },
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionHeader: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { flex: 1, color: '#F4F4F5', fontSize: 19, fontWeight: '800' },
  sectionCount: { color: '#D78CFF', fontSize: 12, fontWeight: '600' },
  progress: { marginBottom: 14 },
  row: { gap: 12 },
  posterWrapper: { borderRadius: 15, overflow: 'hidden', backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653' },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  posterMark: { color: '#9F43D4', fontSize: 54, fontWeight: '900', opacity: 0.7 },
  movieTitle: { color: '#F4F4F5', fontSize: 14, lineHeight: 18, fontWeight: '700', marginTop: 9 },
  movieYear: { color: '#81788A', fontSize: 11, marginTop: 4 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18 },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
});
