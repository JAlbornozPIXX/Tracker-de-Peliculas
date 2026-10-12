import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/bottom-bar';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getListsWithMovies, ListMovie, ListWithMovies } from '@/modules/lists/api/lists';
import { ListOptions } from '@/modules/lists/components/list-options';

function PosterCard({ movie, onPress }: { movie: ListMovie; onPress: () => void }) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={year ? `${movie.title}, ${year}` : movie.title}
      onPress={onPress}
      style={styles.posterCard}>
      <View style={styles.posterWrapper}>
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
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<ListWithMovies[]>([]);

  // Se recarga al volver del detalle de una película o de una lista, donde
  // se pueden quitar títulos o eliminar la lista.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      getListsWithMovies(userId)
        .then((data) => active && setLists(data))
        .catch((err) => Alert.alert('No se pudieron cargar tus listas', err instanceof Error ? err.message : ''))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [userId])
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
        <View style={styles.headerText}>
          <Text style={styles.title}>Mis listas</Text>
          <Text style={styles.count}>{lists.length === 1 ? '1 lista' : `${lists.length} listas`}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BOTTOM_BAR_SPACE }]}
        showsVerticalScrollIndicator={false}>
        {lists.length === 0 && (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Todavía no tienes listas</Text>
            <Text style={styles.emptyCopy}>Crea una desde la página principal y agrega títulos desde el detalle de cada película.</Text>
          </View>
        )}

        {lists.map((list) => (
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
                onRenamed={(name) =>
                  setLists((current) => current.map((item) => (item.id === list.id ? { ...item, name } : item)))
                }
                onDeleted={() => setLists((current) => current.filter((item) => item.id !== list.id))}
              />
            </View>

            {list.movies.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {list.movies.map((movie) => (
                  <PosterCard
                    key={movie.id}
                    movie={movie}
                    onPress={() => router.push({ pathname: '/movie/[id]', params: { id: String(movie.id) } })}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyCopy}>Esta lista está vacía. Agrega títulos desde el detalle de cada película.</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

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
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 48 },
  section: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionHeader: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { flex: 1, color: '#F4F4F5', fontSize: 19, fontWeight: '800' },
  sectionCount: { color: '#D78CFF', fontSize: 12, fontWeight: '600' },
  row: { gap: 12 },
  posterCard: { width: 132 },
  posterWrapper: { height: 198, borderRadius: 15, overflow: 'hidden', backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653' },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  posterMark: { color: '#9F43D4', fontSize: 54, fontWeight: '900', opacity: 0.7 },
  movieTitle: { color: '#F4F4F5', fontSize: 14, lineHeight: 18, fontWeight: '700', marginTop: 9 },
  movieYear: { color: '#81788A', fontSize: 11, marginTop: 4 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18 },
  emptyTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
});
