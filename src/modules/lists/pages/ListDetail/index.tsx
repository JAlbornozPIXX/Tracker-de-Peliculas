import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getListWithMovies, ListMovie, ListWithMovies, setListMoviePositions } from '@/modules/lists/api/lists';
import { ListOptions } from '@/modules/lists/components/list-options';
import { isOrderedKind, listKindLabel } from '@/modules/lists/constants/kinds';
import { moveListMovie, sortListMovies } from '@/modules/lists/utils/list-order';
import { getMovieDetails } from '@/modules/movies/api/tmdb';
import { getWatchedMovieIds } from '@/modules/movies/api/user-movies';
import { MovieResultCard } from '@/modules/movies/components/movie-result-card';
import { withPendingWatchedIds } from '@/modules/sync/queue';
import { errorMessage, showAlert } from '@/utils/alert';

// Terminadas según el servidor más los estados que aún no se suben (sin red o
// recién marcados en la ficha). null si no se pudieron leer.
async function loadWatchedIds(userId: string, movieIds: number[]): Promise<Set<number> | null> {
  try {
    return await withPendingWatchedIds(userId, movieIds, await getWatchedMovieIds(userId, movieIds));
  } catch {
    return null;
  }
}

export default function ListDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ListWithMovies | null>(null);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [reordering, setReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Los títulos guardados antes de que se almacenara release_date no tienen
  // fecha en movies; para esos se consulta el año a TheMovieDB.
  async function fillMissingReleaseDates(movies: ListMovie[], isActive: () => boolean) {
    const missing = movies.filter((movie) => !movie.release_date && movie.tmdb_id != null && movie.media_type);
    if (missing.length === 0) return;

    const dates = new Map<number, string>();
    await Promise.all(
      missing.map((movie) =>
        getMovieDetails(movie.tmdb_id!, movie.media_type!)
          .then((details) => {
            if (details.releaseDate) dates.set(movie.id, details.releaseDate);
          })
          .catch(() => {})
      )
    );
    if (!isActive() || dates.size === 0) return;

    setList(
      (current) =>
        current && {
          ...current,
          movies: current.movies.map((movie) =>
            dates.has(movie.id) ? { ...movie, release_date: dates.get(movie.id)! } : movie
          ),
        }
    );
  }

  // Se recarga al volver del detalle de una película, donde se pueden quitar
  // títulos de la lista o marcarlos Terminados (sube la barra de avance).
  useFocusEffect(
    useCallback(() => {
      if (Number.isNaN(listId) || !userId) {
        setLoading(false);
        return;
      }
      let active = true;
      getListWithMovies(listId)
        .then(async (data) => {
          if (!active) return;
          setList(data);
          if (!data) return;
          fillMissingReleaseDates(data.movies, () => active);
          // La barra es secundaria: si falla, la lista se muestra igual.
          const watched = await loadWatchedIds(userId, data.movies.map((movie) => movie.id));
          if (active && watched) setWatchedIds(watched);
        })
        .catch((err) => showAlert('No se pudo cargar la lista', errorMessage(err)))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [listId, userId])
  );

  // Mueve una película un lugar arriba o abajo. Se pinta de inmediato y se
  // revierte si la escritura falla.
  async function handleMove(index: number, direction: -1 | 1) {
    if (!list || savingOrder) return;
    const previous = list.movies;
    const { movies, changes } = moveListMovie(previous, index, index + direction);
    if (changes.length === 0) return;

    setList({ ...list, movies });
    setSavingOrder(true);
    try {
      await setListMoviePositions(list.id, changes);
    } catch (err) {
      setList((current) => current && { ...current, movies: previous });
      showAlert('No se pudo cambiar el orden', errorMessage(err));
      // Cada posición se guarda por separado: si alguna alcanzó a guardarse,
      // el orden real es el del servidor.
      getListWithMovies(list.id)
        .then((data) => {
          if (!data) return;
          setList((current) => current && { ...current, movies: data.movies });
          fillMissingReleaseDates(data.movies, () => true);
        })
        .catch(() => {});
    } finally {
      setSavingOrder(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  const ordered = list != null && isOrderedKind(list.kind);
  const watchedCount = list ? list.movies.filter((movie) => watchedIds.has(movie.id)).length : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        {list && (
          <View style={styles.headerText}>
            <Text numberOfLines={2} style={styles.title}>
              {list.name}
            </Text>
            <Text style={styles.count}>
              {listKindLabel(list.kind)} · {list.movies.length === 1 ? '1 título' : `${list.movies.length} títulos`}
            </Text>
          </View>
        )}
        {list && (
          <ListOptions
            list={list}
            onRenamed={(name) => setList((current) => current && { ...current, name })}
            onKindChanged={(kind) => {
              setReordering(false);
              setList((current) => current && { ...current, kind, movies: sortListMovies(kind, current.movies) });
            }}
            onDeleted={() => router.back()}
          />
        )}
      </View>

      {list ? (
        <FlatList
          data={list.movies}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            ordered ? (
              <View style={styles.orderedHeader}>
                <ProgressBar done={watchedCount} total={list.movies.length} label={`${list.name}: vistas`} />
                {list.movies.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: reordering }}
                    onPress={() => setReordering((current) => !current)}
                    style={[styles.reorderButton, reordering && styles.reorderButtonActive]}>
                    <Text style={styles.reorderButtonText}>{reordering ? 'Listo' : 'Reordenar'}</Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <View style={styles.itemRow}>
              {ordered && <Text style={styles.itemPosition}>{index + 1}</Text>}
              <View style={styles.itemCard}>
                <MovieResultCard
                  movie={{
                    id: item.id,
                    mediaType: item.media_type ?? 'movie',
                    title: item.title,
                    year: item.release_date ? item.release_date.slice(0, 4) : null,
                    posterUrl: item.poster_url,
                  }}
                  onPress={() => router.push({ pathname: '/movie/[id]', params: { id: String(item.id) } })}
                />
                {ordered && watchedIds.has(item.id) && <Text style={styles.watchedBadge}>✓ Vista</Text>}
              </View>
              {reordering && (
                <View style={styles.moveButtons}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Subir ${item.title}`}
                    disabled={index === 0 || savingOrder}
                    onPress={() => handleMove(index, -1)}
                    style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}>
                    <Text style={styles.moveButtonText}>↑</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Bajar ${item.title}`}
                    disabled={index === list.movies.length - 1 || savingOrder}
                    onPress={() => handleMove(index, 1)}
                    style={[styles.moveButton, index === list.movies.length - 1 && styles.moveButtonDisabled]}>
                    <Text style={styles.moveButtonText}>↓</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.stateText}>
              Esta lista está vacía. Agrega títulos desde el detalle de cada película.
            </Text>
          }
        />
      ) : (
        <Text style={styles.stateText}>No encontramos esta lista.</Text>
      )}
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
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  separator: { height: 12 },
  orderedHeader: { gap: 14, marginBottom: 16 },
  reorderButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  reorderButtonActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  reorderButtonText: { color: '#F4F4F5', fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPosition: { width: 22, color: '#7D7382', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  itemCard: { flex: 1 },
  watchedBadge: { position: 'absolute', top: 10, right: 12, color: '#4ADE80', fontSize: 11, fontWeight: '800' },
  moveButtons: { gap: 6 },
  moveButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  moveButtonDisabled: { opacity: 0.35 },
  moveButtonText: { color: '#F4F4F5', fontSize: 16, fontWeight: '800' },
  stateText: { color: '#8F8795', fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 60, paddingHorizontal: 24 },
});
