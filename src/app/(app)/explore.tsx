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
import { getShamePile } from '@/modules/watchlist/api/shame';
import { SHAME_MIN_DAYS } from '@/modules/watchlist/utils/shame';
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

// Zonas que no están en la barra inferior: se abren desde aquí en un toque.
const QUICK_ACCESS = [
  { href: '/random', icon: '◎', label: 'Azar' },
  { href: '/shame', icon: '⏳', label: 'Pila' },
  { href: '/ranking', icon: '★', label: 'Ranking' },
  { href: '/stats', icon: '▤', label: 'Estadísticas' },
  { href: '/challenges', icon: '⚑', label: 'Retos' },
  { href: '/wrapped', icon: '✦', label: 'Wrapped' },
] as const;

function QuickAccess({ onOpen }: { onOpen: (href: (typeof QUICK_ACCESS)[number]['href']) => void }) {
  return (
    <View style={styles.quickGrid}>
      {QUICK_ACCESS.map((item) => (
        <Pressable
          key={item.href}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => onOpen(item.href)}
          style={({ pressed }) => [styles.quickTile, pressed && styles.quickTilePressed]}>
          <Text style={styles.quickIcon}>{item.icon}</Text>
          <Text numberOfLines={1} style={styles.quickLabel}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ShameBanner({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} películas en la pila de la vergüenza`}
      onPress={onPress}
      style={styles.shameBanner}>
      <Text style={styles.shameIcon}>⏳</Text>
      <View style={styles.shameText}>
        <Text style={styles.shameTitle}>
          {count === 1 ? '1 película' : `${count} películas`} en la pila de la vergüenza
        </Text>
        <Text style={styles.shameCopy}>Llevan {SHAME_MIN_DAYS} días o más en Ver más tarde.</Text>
      </View>
      <Text style={styles.shameArrow}>›</Text>
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
  const [shameCount, setShameCount] = useState(0);
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
          const [{ data, error }, profile, shame] = await Promise.all([
            supabase
              .from('user_movies')
              .select('movie_id, status, rating, movies(id, title, overview, poster_url)')
              .eq('user_id', userId),
            // Sin perfil se muestra la inicial del correo.
            getProfile(userId).catch(() => null),
            // El aviso es secundario: si falla, Inicio se muestra igual.
            getShamePile(userId).catch(() => []),
          ]);
          if (!active) return;

          setShameCount(shame.length);

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

        {shameCount > 0 && <ShameBanner count={shameCount} onPress={() => router.push('/shame')} />}

        <QuickAccess onOpen={(href) => router.push(href)} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver tu Wrapped ${new Date().getFullYear()}`}
          onPress={() => router.push('/wrapped')}
          style={styles.wrappedLink}>
          <View>
            <Text style={styles.wrappedLinkTitle}>Tu Wrapped {new Date().getFullYear()}</Text>
            <Text style={styles.wrappedLinkCopy}>Tu año en cine en una tarjeta para compartir</Text>
          </View>
          <Text style={styles.wrappedLinkArrow}>›</Text>
        </Pressable>

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
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  quickTile: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  quickTilePressed: { backgroundColor: '#211D28' },
  quickIcon: { color: '#D78CFF', fontSize: 20, lineHeight: 22 },
  quickLabel: { color: '#D5D0D8', fontSize: 12, fontWeight: '700' },
  shameBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: '#2A2112', borderWidth: 1, borderColor: '#5C4520', marginTop: -8, marginBottom: 22 },
  shameIcon: { fontSize: 22 },
  shameText: { flex: 1 },
  shameTitle: { color: '#F4F4F5', fontSize: 14, fontWeight: '800' },
  shameCopy: { color: '#C9B48A', fontSize: 12, marginTop: 3 },
  shameArrow: { color: '#E8B64C', fontSize: 24, lineHeight: 24 },
  wrappedLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#17151D', borderRadius: 16, borderWidth: 1, borderColor: '#4D1E61', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 24 },
  wrappedLinkTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '800' },
  wrappedLinkCopy: { color: '#8F8795', fontSize: 12, marginTop: 3 },
  wrappedLinkArrow: { color: '#D78CFF', fontSize: 26, lineHeight: 26 },
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
