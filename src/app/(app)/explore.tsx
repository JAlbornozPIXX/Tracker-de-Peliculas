import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/modules/auth/context/AuthContext';
import { supabase } from '@/utils/supabase';

type Movie = {
  id: number;
  title: string;
  overview: string | null;
  poster_url: string | null;
};

type TrackedMovie = {
  movie_id: number;
  status: 'watchlist' | 'watching' | 'watched';
  movies: Movie | null;
};

function MovieCard({ movie, compact = false }: { movie: Movie; compact?: boolean }) {
  return (
    <View style={[styles.movieCard, compact && styles.compactMovieCard]}>
      <View style={styles.posterPlaceholder}>
        <Text style={styles.posterMark}>C</Text>
      </View>
      <Text numberOfLines={2} style={styles.movieTitle}>
        {movie.title}
      </Text>
      <Text style={styles.movieMeta}>Película</Text>
    </View>
  );
}

function SearchBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar películas y series"
      onPress={onPress}
      style={styles.searchBar}>
      <Text style={styles.searchBarIcon}>⌕</Text>
      <Text style={styles.searchBarPlaceholder}>Buscar películas y series</Text>
    </Pressable>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && <Text style={styles.sectionCount}>{count} títulos</Text>}
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<TrackedMovie[]>([]);
  const [watching, setWatching] = useState<TrackedMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHome() {
      const [movieResult, userResult] = await Promise.all([
        supabase
          .from('movies')
          .select('id, title, overview, poster_url')
          .order('title'),
        supabase.auth.getUser(),
      ]);

      if (movieResult.error) {
        Alert.alert('No se pudo cargar el catálogo', movieResult.error.message);
      } else {
        setMovies(movieResult.data ?? []);
      }

      const userId = userResult.data.user?.id;
      if (userId) {
        const { data, error } = await supabase
          .from('user_movies')
          .select('movie_id, status, movies(id, title, overview, poster_url)')
          .eq('user_id', userId);

        if (!error) {
          const tracked = (data ?? []) as unknown as TrackedMovie[];
          setWatchlist(tracked.filter((item) => item.status === 'watchlist'));
          setWatching(tracked.filter((item) => item.status === 'watching'));
        }
      }

      setLoading(false);
    }

    loadHome();
  }, []);

  async function handleSignOut() {
    await signOut();
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
        <Text style={styles.loadingText}>Preparando tu cartelera</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>CINE-TECA</Text>
            <Text style={styles.greeting}>Tu espacio de cine</Text>
          </View>
          <Pressable accessibilityLabel="Cerrar sesión" onPress={handleSignOut} style={styles.avatar}>
            <Text style={styles.avatarText}>CT</Text>
          </Pressable>
        </View>

        <SearchBar onPress={() => router.push('/search')} />

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroKicker}>TU CARTELERA PERSONAL</Text>
          <Text style={styles.heroTitle}>Siempre hay una historia para ti.</Text>
          <Text style={styles.heroCopy}>
            Guarda, descubre y retoma tus películas sin perder el hilo.
          </Text>
          <Pressable onPress={() => router.push('/search')} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Explorar catálogo</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        <SectionTitle title="Continuar viendo" count={watching.length} />
        {watching.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {watching.map((item) => item.movies && <MovieCard key={item.movie_id} movie={item.movies} />)}
          </ScrollView>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Tu próxima sesión empieza aquí</Text>
            <Text style={styles.emptyCopy}>Marca una película como “viendo” para encontrarla rápidamente.</Text>
          </View>
        )}

        <SectionTitle title="Mi lista" count={watchlist.length} />
        {watchlist.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {watchlist.map((item) => item.movies && <MovieCard key={item.movie_id} movie={item.movies} />)}
          </ScrollView>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Tu lista está esperando</Text>
            <Text style={styles.emptyCopy}>Guarda títulos para tenerlos a mano después.</Text>
          </View>
        )}

        <SectionTitle title="Catálogo" count={movies.length} />
        {movies.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {movies.map((movie) => <MovieCard key={movie.id} movie={movie} compact />)}
          </ScrollView>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Todavía no hay películas</Text>
            <Text style={styles.emptyCopy}>Añade títulos desde Supabase para llenar tu cartelera.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom + 12, 18) }]}>
        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.tabIcon}>⌂</Text>
          <Text style={styles.activeTabText}>Inicio</Text>
        </View>
        <Pressable style={styles.tab} onPress={() => router.push('/search')}>
          <Text style={styles.tabIcon}>⌕</Text>
          <Text style={styles.tabText}>Descubre</Text>
        </Pressable>
        <View style={styles.tab}>
          <Text style={styles.tabIcon}>≡</Text>
          <Text style={styles.tabText}>Listas</Text>
        </View>
        <Pressable style={styles.tab} onPress={handleSignOut}>
          <Text style={styles.tabIcon}>●</Text>
          <Text style={styles.tabText}>Perfil</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { color: '#A1A1AA', fontSize: 14 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: '#B94DFF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  greeting: { color: '#F4F4F5', fontSize: 23, fontWeight: '700', marginTop: 4 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#25212D', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A315C' },
  avatarText: { color: '#D6A5FF', fontSize: 12, fontWeight: '800' },
  hero: { overflow: 'hidden', minHeight: 220, borderRadius: 22, padding: 22, backgroundColor: '#24102D', borderWidth: 1, borderColor: '#4D1E61', justifyContent: 'flex-end', marginBottom: 16 },
  heroGlow: { position: 'absolute', right: -70, top: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: '#8B2FC1', opacity: 0.35 },
  heroKicker: { color: '#D78CFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '800', maxWidth: 300 },
  heroCopy: { color: '#D2C4D8', fontSize: 14, lineHeight: 20, marginTop: 10, maxWidth: 300 },
  heroButton: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: '#A83BDD', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  arrow: { color: '#FFFFFF', fontSize: 24, lineHeight: 18 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', marginBottom: 22 },
  searchBarIcon: { color: '#D78CFF', fontSize: 18 },
  searchBarPlaceholder: { color: '#7D7382', fontSize: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  sectionTitle: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  sectionCount: { color: '#7D7382', fontSize: 12 },
  row: { gap: 12, paddingBottom: 28 },
  movieCard: { width: 142 },
  compactMovieCard: { width: 128 },
  posterPlaceholder: { height: 178, borderRadius: 15, backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  posterMark: { color: '#9F43D4', fontSize: 54, fontWeight: '900', opacity: 0.7 },
  movieTitle: { color: '#F4F4F5', fontSize: 14, lineHeight: 18, fontWeight: '700', marginTop: 9 },
  movieMeta: { color: '#81788A', fontSize: 11, marginTop: 4 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18, marginBottom: 24 },
  emptyTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19, marginTop: 6 },
  bottomBar: { position: 'absolute', left: 18, right: 18, bottom: 18, height: 70, borderRadius: 28, backgroundColor: '#29262F', borderWidth: 1, borderColor: '#47414D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 },
  tab: { alignItems: 'center', justifyContent: 'center', minWidth: 62, gap: 4 },
  activeTab: { backgroundColor: '#403B47', borderRadius: 22, paddingVertical: 8, paddingHorizontal: 13 },
  tabIcon: { color: '#D5D0D8', fontSize: 20, lineHeight: 21 },
  tabText: { color: '#D5D0D8', fontSize: 10, fontWeight: '600' },
  activeTabText: { color: '#B94DFF', fontSize: 10, fontWeight: '800' },
});