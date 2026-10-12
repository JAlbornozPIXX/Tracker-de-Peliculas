import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getMovieById, MovieRow } from '@/modules/movies/api/movies';
import { getUserMovie, setStatus, updateRating, updateNotes } from '@/modules/movies/api/user-movies';
import { StatusKey } from '@/modules/movies/constants/status';
import { StatusPicker } from '@/modules/movies/components/status-picker';
import { StarRatingInput } from '@/modules/movies/components/star-rating-input';

const NOTES_MAX = 2000;
const NOTES_DEBOUNCE_MS = 900;

export default function MovieDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [movie, setMovie] = useState<MovieRow | null>(null);
  const [status, setStatusState] = useState<StatusKey | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [noteSaveState, setNoteSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasLoaded = useRef(false);
  const latestNotes = useRef(notes);

  useEffect(() => {
    if (!userId || Number.isNaN(movieId)) return;
    let active = true;
    Promise.all([getMovieById(movieId), getUserMovie(userId, movieId)])
      .then(([movieData, tracking]) => {
        if (!active) return;
        setMovie(movieData);
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
  }, [userId, movieId]);

  useEffect(() => {
    latestNotes.current = notes;
  }, [notes]);

  const debouncedNotes = useDebouncedValue(notes, NOTES_DEBOUNCE_MS);
  useEffect(() => {
    if (!hasLoaded.current || !userId || status == null) return;
    setNoteSaveState('saving');
    updateNotes(userId, movieId, debouncedNotes || null).then(({ error }) => {
      setNoteSaveState(error ? 'idle' : 'saved');
      if (error) Alert.alert('No se pudo guardar la nota', error.message);
    });
  }, [debouncedNotes, userId, movieId, status]);

  // Guarda cualquier texto pendiente de inmediato al salir, para que navegar
  // justo después de escribir no pierda texto todavía dentro de la ventana
  // de espera del debounce.
  useEffect(() => {
    return () => {
      if (userId && status != null) {
        updateNotes(userId, movieId, latestNotes.current || null);
      }
    };
  }, [userId, movieId, status]);

  async function handleStatusChange(next: StatusKey) {
    setStatusState(next);
    if (!userId) return;
    const { error } = await setStatus(userId, movieId, next);
    if (error) Alert.alert('No se pudo actualizar el estado', error.message);
  }

  async function handleRatingChange(next: number | null) {
    setRating(next);
    if (!userId) return;
    const { error } = await updateRating(userId, movieId, next);
    if (error) Alert.alert('No se pudo guardar la calificación', error.message);
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

        <View style={styles.posterPlaceholder}>
          <Text style={styles.posterMark}>{movie.title.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{movie.title}</Text>
        {movie.overview && <Text style={styles.overview}>{movie.overview}</Text>}
        <View style={styles.metaRow}>
          {movie.genre.map((g) => (
            <View key={g} style={styles.genrePill}>
              <Text style={styles.genrePillText}>{g}</Text>
            </View>
          ))}
          {movie.duration_minutes != null && <Text style={styles.durationText}>{movie.duration_minutes} min</Text>}
        </View>

        <Text style={styles.sectionLabel}>Estado</Text>
        <StatusPicker value={status} onChange={handleStatusChange} />

        {status == null ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyCopy}>Elige un estado para empezar a calificar y escribir una nota.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Calificación</Text>
            <StarRatingInput value={rating} onChange={handleRatingChange} />

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
  posterPlaceholder: { height: 220, borderRadius: 18, backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  posterMark: { color: '#9F43D4', fontSize: 64, fontWeight: '900', opacity: 0.7 },
  title: { color: '#F4F4F5', fontSize: 23, fontWeight: '800' },
  overview: { color: '#A1A1AA', fontSize: 14, lineHeight: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 18, alignItems: 'center' },
  genrePill: { backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  genrePillText: { color: '#D78CFF', fontSize: 12, fontWeight: '700' },
  durationText: { color: '#81788A', fontSize: 12 },
  sectionLabel: { color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 16 },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
  noteInput: { minHeight: 120, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 14, padding: 14, color: '#F4F4F5', fontSize: 14, textAlignVertical: 'top' },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  noteCounter: { color: '#7D7382', fontSize: 11 },
  saveState: { color: '#A1A1AA', fontSize: 11 },
});
