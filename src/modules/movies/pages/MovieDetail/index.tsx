import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { MovieListsPicker } from '@/modules/lists/components/movie-lists-picker';
import { ensureMovieFromTmdb, findMovieIdByTmdb, getMovieById, MovieRow } from '@/modules/movies/api/movies';
import { getMovieDetails, MovieDetails } from '@/modules/movies/api/tmdb';
import { getUserMovie, setStatus, updateNotes, updateRating } from '@/modules/movies/api/user-movies';
import { ReactionPicker } from '@/modules/movies/components/reaction-picker';
import { StarRatingInput } from '@/modules/movies/components/star-rating-input';
import { StatusPicker } from '@/modules/movies/components/status-picker';
import { ViewsSection } from '@/modules/movies/components/views-section';
import { StatusKey } from '@/modules/movies/constants/status';
import { useMovieViews } from '@/modules/movies/hooks/use-movie-views';

const NOTES_MAX = 2000;
const NOTES_DEBOUNCE_MS = 900;

type MovieView = Pick<MovieDetails, 'title' | 'overview' | 'posterUrl' | 'year' | 'genres' | 'durationMinutes'>;

function toMovieView(row: MovieRow): MovieView {
  return {
    title: row.title,
    overview: row.overview,
    posterUrl: row.poster_url,
    genres: row.genre,
    year: row.release_date ? row.release_date.slice(0, 4) : null,
    durationMinutes: row.duration_minutes,
  };
}

export default function MovieDetail() {
  const { id, mediaType } = useLocalSearchParams<{ id: string; mediaType?: string }>();
  const movieId = Number(id);
  // Con mediaType el id es de TheMovieDB (viene de la búsqueda); sin él es el
  // id interno de la tabla movies. user_movies y list_movies solo aceptan el
  // id interno, así que un título de TheMovieDB se crea en movies la primera
  // vez que se le pone un estado o se agrega a una lista.
  const tmdbMediaType = mediaType === 'movie' || mediaType === 'tv' ? mediaType : null;
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [movie, setMovie] = useState<MovieView | null>(null);
  const [tmdbDetails, setTmdbDetails] = useState<MovieDetails | null>(null);
  const [tmdbInternalId, setTmdbInternalId] = useState<number | null>(null);
  const [status, setStatusState] = useState<StatusKey | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [noteSaveState, setNoteSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasLoaded = useRef(false);
  const latestNotes = useRef(notes);

  // null mientras un título de TheMovieDB todavía no existe en movies.
  const internalId = tmdbMediaType ? tmdbInternalId : movieId;
  const { views, registerView, registerAutoViewToday, removeView } = useMovieViews(userId, internalId);

  useEffect(() => {
    if (!userId || Number.isNaN(movieId)) return;

    if (tmdbMediaType) {
      const controller = new AbortController();
      Promise.all([
        getMovieDetails(movieId, tmdbMediaType, controller.signal),
        // Si la búsqueda en movies falla, el detalle se muestra igual.
        findMovieIdByTmdb(movieId, tmdbMediaType).catch(() => null),
      ])
        .then(async ([details, foundId]) => {
          const tracking = foundId != null ? await getUserMovie(userId, foundId) : null;
          if (controller.signal.aborted) return;
          setMovie(details);
          setTmdbDetails(details);
          setTmdbInternalId(foundId);
          setStatusState(tracking?.status ?? null);
          setRating(tracking?.rating ?? null);
          setNotes(tracking?.notes ?? '');
          hasLoaded.current = true;
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          Alert.alert('No se pudo cargar la película', err instanceof Error ? err.message : '');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }

    let active = true;
    Promise.all([getMovieById(movieId), getUserMovie(userId, movieId)])
      .then(([movieData, tracking]) => {
        if (!active) return;
        setMovie(movieData && toMovieView(movieData));
        setStatusState(tracking?.status ?? null);
        setRating(tracking?.rating ?? null);
        setNotes(tracking?.notes ?? '');
        hasLoaded.current = true;
      })
      .catch((err) => Alert.alert('No se pudo cargar la película', err instanceof Error ? err.message : ''))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, movieId, tmdbMediaType]);

  useEffect(() => {
    latestNotes.current = notes;
  }, [notes]);

  const debouncedNotes = useDebouncedValue(notes, NOTES_DEBOUNCE_MS);
  useEffect(() => {
    if (!hasLoaded.current || !userId || internalId == null || status == null) return;
    setNoteSaveState('saving');
    updateNotes(userId, internalId, debouncedNotes || null).then(({ error }) => {
      setNoteSaveState(error ? 'idle' : 'saved');
      if (error) Alert.alert('No se pudo guardar la nota', error.message);
    });
  }, [debouncedNotes, userId, internalId, status]);

  // Guarda cualquier texto pendiente de inmediato al salir, para que navegar
  // justo después de escribir no pierda texto todavía dentro de la ventana
  // de espera del debounce.
  useEffect(() => {
    return () => {
      if (userId && internalId != null && status != null) {
        updateNotes(userId, internalId, latestNotes.current || null);
      }
    };
  }, [userId, internalId, status]);

  async function handleStatusChange(next: StatusKey) {
    const previous = status;
    setStatusState(next);
    if (!userId) return;
    try {
      let id = internalId;
      if (id == null) {
        if (!tmdbDetails) throw new Error('Todavía no se cargó el título.');
        id = await ensureMovieFromTmdb(tmdbDetails);
        setTmdbInternalId(id);
      }
      const { error } = await setStatus(userId, id, next);
      if (error) throw error;
      if (next === 'watched') await registerFinishView(id);
    } catch (err) {
      setStatusState(previous);
      Alert.alert('No se pudo actualizar el estado', err instanceof Error ? err.message : '');
    }
  }

  // Pasar a Terminado registra la vista de hoy. Si falla, el estado ya quedó
  // guardado: solo se avisa y la vista se puede registrar a mano.
  async function registerFinishView(id: number) {
    try {
      await registerAutoViewToday(id);
    } catch (err) {
      Alert.alert('No se pudo registrar la vista', err instanceof Error ? err.message : '');
    }
  }

  async function handleRatingChange(next: number | null) {
    const previousRating = rating;
    const previousStatus = status;
    setRating(next);
    if (!userId) return;
    try {
      if (status == null) {
        // No hay fila en user_movies: se crea con estado Terminado y la calificación a la vez.
        let id = internalId;
        if (id == null) {
          if (!tmdbDetails) throw new Error('Todavía no se cargó el título.');
          id = await ensureMovieFromTmdb(tmdbDetails);
          setTmdbInternalId(id);
        }
        setStatusState('watched');
        const { error } = await setStatus(userId, id, 'watched', next);
        if (error) throw error;
        await registerFinishView(id);
      } else {
        const { error } = await updateRating(userId, internalId!, next);
        if (error) throw error;
      }
    } catch (err) {
      setRating(previousRating);
      setStatusState(previousStatus);
      Alert.alert('No se pudo guardar la calificación', err instanceof Error ? err.message : '');
    }
  }

  async function ensureInternalMovieId() {
    if (internalId != null) return internalId;
    if (!tmdbDetails) throw new Error('Todavía no se cargó el título.');
    return ensureMovieFromTmdb(tmdbDetails);
  }

  async function handleAddView(viewedOn: string) {
    await registerView(await ensureInternalMovieId(), viewedOn);
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  if (!movie) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.emptyCopy}>No encontramos esta película.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        {movie.posterUrl ? (
          <Image accessibilityIgnoresInvertColors source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterMark}>{movie.title.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.title}>{movie.title}</Text>
        {movie.overview && <Text style={styles.overview}>{movie.overview}</Text>}
        <View style={styles.metaRow}>
          {movie.genres.map((g) => (
            <View key={g} style={styles.genrePill}>
              <Text style={styles.genrePillText}>{g}</Text>
            </View>
          ))}
          {movie.year && <Text style={styles.durationText}>{movie.year}</Text>}
          {movie.durationMinutes != null && <Text style={styles.durationText}>{movie.durationMinutes} min</Text>}
        </View>

        <Text style={styles.sectionLabel}>Estado</Text>
        <StatusPicker value={status} onChange={handleStatusChange} />

        <Text style={styles.sectionLabel}>Vistas</Text>
        <ViewsSection views={views} onAdd={handleAddView} onDelete={removeView} />

        <Text style={styles.sectionLabel}>Calificación</Text>
        <View style={styles.ratingRow}>
          <StarRatingInput value={rating} onChange={handleRatingChange} />
          <ReactionPicker movieId={internalId} ensureMovieId={ensureInternalMovieId} />
        </View>

        {status == null ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyCopy}>Elige un estado o califica para escribir una nota.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Nota privada</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={NOTES_MAX}
              placeholder="Solo tú puedes leer esta nota…"
              placeholderTextColor="#7D7382"
              style={styles.noteInput}
            />
            <View style={styles.noteFooter}>
              <Text style={styles.noteCounter}>
                {notes.length} / {NOTES_MAX}
              </Text>
              <Text style={styles.saveState}>
                {noteSaveState === 'saving' ? 'Guardando…' : noteSaveState === 'saved' ? 'Guardado' : ''}
              </Text>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Listas</Text>
        <MovieListsPicker movieId={internalId} ensureMovieId={ensureInternalMovieId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, gap: 6 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  backIcon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  poster: { width: 180, aspectRatio: 2 / 3, alignSelf: 'center', borderRadius: 18, backgroundColor: '#21172A', marginBottom: 14 },
  posterPlaceholder: { height: 220, borderRadius: 18, backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  posterMark: { color: '#9F43D4', fontSize: 64, fontWeight: '900', opacity: 0.7 },
  title: { color: '#F4F4F5', fontSize: 23, fontWeight: '800' },
  overview: { color: '#A1A1AA', fontSize: 14, lineHeight: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 18, alignItems: 'center' },
  genrePill: { backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  genrePillText: { color: '#D78CFF', fontSize: 12, fontWeight: '700' },
  durationText: { color: '#81788A', fontSize: 12 },
  sectionLabel: { color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 16 },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
  noteInput: { minHeight: 120, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 14, padding: 14, color: '#F4F4F5', fontSize: 14, textAlignVertical: 'top' },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  noteCounter: { color: '#7D7382', fontSize: 11 },
  saveState: { color: '#A1A1AA', fontSize: 11 },
});
