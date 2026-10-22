import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/bottom-bar';
import { GoldenPoster } from '@/components/golden-poster';
import { ListsSection } from '@/modules/lists/components/lists-section';
import { getProfile } from '@/modules/profile/api/profile';
import { ProfileAvatar } from '@/modules/profile/components/profile-avatar';
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
  rating: number | null;
  movies: Movie | null;
};

const CARD_WIDTH = 142;
const COMPACT_CARD_WIDTH = 128;

function MovieCard({
  movie,
  rating,
  compact = false,
  onPress,
}: {
  movie: Movie;
  rating: number | null;
  compact?: boolean;
  onPress?: () => void;
}) {
  const width = compact ? COMPACT_CARD_WIDTH : CARD_WIDTH;
  return (
    <Pressable onPress={onPress} style={{ width }}>
      <GoldenPoster posterUrl={movie.poster_url} title={movie.title} rating={rating} size={width} />
      <Text numberOfLines={2} style={styles.movieTitle}>
        {movie.title}
      </Text>
      <Text style={styles.movieMeta}>Película</Text>
    </Pressable>
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
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [watching, setWatching] = useState<TrackedMovie[]>([]);
  // Nota del usuario por movie_id, para el marco dorado del catálogo.
  const [ratings, setRatings] = useState<Record<number, number | null>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLabel, setAvatarLabel] = useState('');
  const [loading, setLoading] = useState(true);

  // Se recarga al volver a la pantalla para reflejar los estados cambiados
  // desde el detalle de una película y la foto cambiada desde el perfil.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHome() {
        const [movieResult, userResult] = await Promise.all([
          supabase
            .from('movies')
            .select('id, title, overview, poster_url')
            .order('title'),
          supabase.auth.getUser(),
        ]);
        if (!active) return;

        if (movieResult.error) {
          Alert.alert('No se pudo cargar el catálogo', movieResult.error.message);
        } else {
          setMovies(movieResult.data ?? []);
        }

        const userId = userResult.data.user?.id;
        if (userId) {
          const [{ data, error }, profile] = await Promise.all([
            supabase
              .from('user_movies')
              .select('movie_id, status, rating, movies(id, title, overview, poster_url)')
              .eq('user_id', userId),
            // Sin perfil se muestra la inicial del correo.
            getProfile(userId).catch(() => null),
          ]);
          if (!active) return;

          // La foto se sube siempre a la misma URL; updated_at cambia con cada
          // subida y evita que se muestre la imagen anterior desde la caché.
          setAvatarUrl(
            profile?.avatarUrl ? `${profile.avatarUrl}?t=${encodeURIComponent(profile.updatedAt ?? '')}` : null
          );
          setAvatarLabel(profile?.displayName || userResult.data.user?.email || '');

          if (!error) {
            const tracked = (data ?? []) as unknown as TrackedMovie[];
            setWatching(tracked.filter((item) => item.status === 'watching'));
            setRatings(Object.fromEntries(tracked.map((item) => [item.movie_id, item.rating])));
          }
        }

        setLoading(false);
      }

      loadHome();
      return () => {
        active = false;
      };
    }, [])
  );

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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + BOTTOM_BAR_SPACE }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>CINE-TECA</Text>
            <Text style={styles.greeting}>Tu espacio de cine</Text>
          </View>
          <ProfileAvatar
            avatarUrl={avatarUrl}
            label={avatarLabel}
            size={42}
            accessibilityLabel="Ver perfil"
            onPress={() => router.push('/profile')}
          />
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
            {watching.map(
              (item) =>
                item.movies && (
                  <MovieCard
                    key={item.movie_id}
                    movie={item.movies}
                    rating={item.rating}
                    onPress={() => router.push({ pathname: '/movie/[id]', params: { id: String(item.movie_id) } })}
                  />
                )
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Tu próxima sesión empieza aquí</Text>
            <Text style={styles.emptyCopy}>Marca una película como “viendo” para encontrarla rápidamente.</Text>
          </View>
        )}

        <ListsSection />

        <SectionTitle title="Catálogo" count={movies.length} />
        {movies.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                rating={ratings[movie.id] ?? null}
                compact
                onPress={() => router.push({ pathname: '/movie/[id]', params: { id: String(movie.id) } })}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Todavía no hay películas</Text>
            <Text style={styles.emptyCopy}>Añade títulos desde Supabase para llenar tu cartelera.</Text>
          </View>
        )}
      </ScrollView>

      <BottomBar active="home" />
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
  movieTitle: { color: '#F4F4F5', fontSize: 14, lineHeight: 18, fontWeight: '700', marginTop: 9 },
  movieMeta: { color: '#81788A', fontSize: 11, marginTop: 4 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18, marginBottom: 24 },
  emptyTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19, marginTop: 6 },
});