import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getListWithMovies, ListMovie, ListWithMovies } from '@/modules/lists/api/lists';
import { ListOptions } from '@/modules/lists/components/list-options';
import { getMovieDetails } from '@/modules/movies/api/tmdb';
import { MovieResultCard } from '@/modules/movies/components/movie-result-card';

export default function ListDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<ListWithMovies | null>(null);

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
  // títulos de la lista.
  useFocusEffect(
    useCallback(() => {
      if (Number.isNaN(listId)) {
        setLoading(false);
        return;
      }
      let active = true;
      getListWithMovies(listId)
        .then((data) => {
          if (!active) return;
          setList(data);
          if (data) fillMissingReleaseDates(data.movies, () => active);
        })
        .catch((err) => Alert.alert('No se pudo cargar la lista', err instanceof Error ? err.message : ''))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [listId])
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

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
              {list.movies.length === 1 ? '1 título' : `${list.movies.length} títulos`}
            </Text>
          </View>
        )}
        {list && (
          <ListOptions
            list={list}
            onRenamed={(name) => setList((current) => current && { ...current, name })}
            onDeleted={() => router.back()}
          />
        )}
      </View>

      {list ? (
        <FlatList
          data={list.movies}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
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
  stateText: { color: '#8F8795', fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 60, paddingHorizontal: 24 },
});
