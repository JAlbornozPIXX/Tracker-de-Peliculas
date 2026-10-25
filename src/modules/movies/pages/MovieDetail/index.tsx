import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldenPoster } from '@/components/golden-poster';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { addMovieToList, getListIdsForMovie, removeMovieFromList } from '@/modules/lists/api/lists';
import { MovieListsPicker } from '@/modules/lists/components/movie-lists-picker';
import { ensureMovieFromTmdb, findMovieIdByTmdb, getMovieById, MovieRow } from '@/modules/movies/api/movies';
import { getReactionIdsForMovie } from '@/modules/movies/api/reactions';
import { getMovieDetails, MovieDetails } from '@/modules/movies/api/tmdb';
import { getUserMovie } from '@/modules/movies/api/user-movies';
import { ReactionPicker } from '@/modules/movies/components/reaction-picker';
import { StarRatingInput } from '@/modules/movies/components/star-rating-input';
import { StatusPicker } from '@/modules/movies/components/status-picker';
import { ViewsSection } from '@/modules/movies/components/views-section';
import { useMovieViews } from '@/modules/movies/hooks/use-movie-views';
import {
  diffReview,
  EMPTY_REVIEW,
  hasChanges,
  rateDraft,
  rebaseDraft,
  ReviewDraft,
  setMembership,
  toggleId,
} from '@/modules/movies/utils/review-draft';
import { usePendingSync } from '@/modules/sync/hooks/use-pending-sync';
import {
  saveMovieReaction,
  saveUserMovie,
  syncQueue,
  withPendingReactions,
  withPendingUserMovie,
} from '@/modules/sync/queue';
import { confirmUnsavedChanges, errorMessage, showAlert } from '@/utils/alert';

const NOTES_MAX = 2000;
// Con red un guardado sube en menos de un segundo: el aviso de pendiente solo
// aparece si el cambio sigue en el teléfono pasado este tiempo.
const PENDING_NOTICE_DELAY_MS = 800;
// Espacio sobre la nota cuando se lleva al tope de la pantalla.
const NOTE_REVEAL_MARGIN = 12;
// Lo que crece más arriba de lo que se está viendo (una vista nueva, por
// ejemplo) no corre la pantalla.
const KEEP_VISIBLE_CONTENT = { minIndexForVisible: 0 };

type MovieView = Pick<MovieDetails, 'title' | 'overview' | 'posterUrl' | 'year' | 'genres' | 'durationMinutes'>;

type Review = { saved: ReviewDraft; draft: ReviewDraft };

type SaveNotice = 'saved' | 'pending' | null;

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

// Lo guardado de un título que ya existe en movies: seguimiento, listas y
// calificadores, con los cambios que siguen pendientes en el teléfono.
async function loadReview(userId: string, movieId: number): Promise<ReviewDraft> {
  const [tracking, listIds, reactionIds] = await Promise.all([
    getUserMovie(userId, movieId).then((row) => withPendingUserMovie(userId, movieId, row)),
    getListIdsForMovie(movieId),
    getReactionIdsForMovie(userId, movieId).then((ids) => withPendingReactions(userId, movieId, ids)),
  ]);
  return {
    status: tracking?.status ?? null,
    rating: tracking?.rating ?? null,
    notes: tracking?.notes ?? '',
    listIds,
    reactionIds,
  };
}

function saveNoticeText(dirty: boolean, notice: SaveNotice): string {
  if (dirty) return 'Tienes cambios sin guardar.';
  if (notice === 'pending') return 'Guardado en el teléfono: se sincroniza cuando vuelva la conexión.';
  if (notice === 'saved') return 'Cambios guardados.';
  return '';
}

export default function MovieDetail() {
  const { id, mediaType } = useLocalSearchParams<{ id: string; mediaType?: string }>();
  const movieId = Number(id);
  // Con mediaType el id es de TheMovieDB (viene de la búsqueda); sin él es el
  // id interno de la tabla movies. user_movies y list_movies solo aceptan el
  // id interno, así que un título de TheMovieDB se crea en movies la primera
  // vez que se guarda algo.
  const tmdbMediaType = mediaType === 'movie' || mediaType === 'tv' ? mediaType : null;
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [movie, setMovie] = useState<MovieView | null>(null);
  const [tmdbDetails, setTmdbDetails] = useState<MovieDetails | null>(null);
  const [tmdbInternalId, setTmdbInternalId] = useState<number | null>(null);
  // Estado, estrellas, nota, listas y calificadores: lo guardado y lo que se
  // está editando. Nada se escribe hasta tocar Guardar.
  const [review, setReview] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);
  // Resultado del último Guardar; se borra con el próximo cambio.
  const [saveNotice, setSaveNotice] = useState<SaveNotice>(null);
  // Al descartar (o guardar al salir) se sale sin volver a preguntar.
  const [leaving, setLeaving] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const noteY = useRef(0);
  const viewportHeight = useRef(0);

  // null mientras un título de TheMovieDB todavía no existe en movies.
  const internalId = tmdbMediaType ? tmdbInternalId : movieId;
  const { views, registerView, registerAutoViewToday, removeView } = useMovieViews(userId, internalId);
  const pendingSync = usePendingSync(internalId);
  const pendingSettled = useDebouncedValue(pendingSync, PENDING_NOTICE_DELAY_MS);
  const showPending = pendingSync && pendingSettled;

  const dirty = review != null && hasChanges(diffReview(review.saved, review.draft));

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
          const saved = foundId != null ? await loadReview(userId, foundId) : EMPTY_REVIEW;
          if (controller.signal.aborted) return;
          setMovie(details);
          setTmdbDetails(details);
          setTmdbInternalId(foundId);
          setReview({ saved, draft: saved });
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          showAlert('No se pudo cargar la película', errorMessage(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }

    let active = true;
    Promise.all([getMovieById(movieId), loadReview(userId, movieId)])
      .then(([movieData, saved]) => {
        if (!active) return;
        setMovie(movieData && toMovieView(movieData));
        setReview({ saved, draft: saved });
      })
      .catch((err) => showAlert('No se pudo cargar la película', errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, movieId, tmdbMediaType]);

  // Un cambio guardado se descartó porque el servidor tenía uno más reciente
  // (o lo rechazó): se vuelve a leer lo guardado y el borrador conserva lo que
  // se esté editando. Las vistas las recarga su propio hook.
  useEffect(() => {
    if (!userId || internalId == null) return;
    return syncQueue.subscribeDiscarded((discardedId, kind) => {
      if (discardedId !== internalId || kind === 'auto_view') return;
      loadReview(userId, internalId)
        .then((reloaded) =>
          setReview(
            (current) => current && { saved: reloaded, draft: rebaseDraft(current.saved, current.draft, reloaded) }
          )
        )
        .catch(() => {
          // Sin red se queda lo que se ve; la próxima apertura carga del servidor.
        });
    });
  }, [userId, internalId]);

  // Salir (botón, gesto o atrás de Android) con cambios sin guardar pregunta
  // antes qué hacer con ellos.
  usePreventRemove(dirty && !leaving, ({ repeat }) => {
    confirmUnsavedChanges({
      onSave: () => {
        handleSave().then((saved) => {
          if (!saved) return;
          setLeaving(true);
          repeat();
        });
      },
      onDiscard: () => {
        setLeaving(true);
        repeat();
      },
    });
  });

  function updateDraft(update: (draft: ReviewDraft) => ReviewDraft) {
    setReview((current) => current && { ...current, draft: update(current.draft) });
    setSaveNotice(null);
  }

  function markSaved(update: (saved: ReviewDraft) => ReviewDraft) {
    setReview((current) => current && { ...current, saved: update(current.saved) });
  }

  // Guarda de una vez todo lo que cambió. Sin red, estado, estrellas, nota y
  // calificadores quedan en el teléfono y se suben después; las listas
  // necesitan red. Si algo falla, lo que ya se guardó no se vuelve a enviar.
  async function handleSave(): Promise<boolean> {
    Keyboard.dismiss();
    if (!userId || !review || saving) return false;
    const { draft } = review;
    const changes = diffReview(review.saved, draft);
    if (!hasChanges(changes)) return true;

    setSaving(true);
    let pendingOnPhone = false;
    try {
      const id = await ensureInternalMovieId();
      if (Object.keys(changes.fields).length > 0) {
        // Solo un rechazo del servidor lanza.
        if ((await saveUserMovie(userId, id, changes.fields)) === 'pending') pendingOnPhone = true;
        markSaved((saved) => ({ ...saved, status: draft.status, rating: draft.rating, notes: draft.notes }));
        if (changes.finished) await registerFinishView(id);
      }
      for (const { reactionId, selected } of changes.reactions) {
        if ((await saveMovieReaction(userId, id, reactionId, selected)) === 'pending') pendingOnPhone = true;
        markSaved((saved) => ({ ...saved, reactionIds: setMembership(saved.reactionIds, reactionId, selected) }));
      }
      for (const listId of changes.addedListIds) {
        const { error } = await addMovieToList(listId, id);
        if (error) throw error;
        markSaved((saved) => ({ ...saved, listIds: setMembership(saved.listIds, listId, true) }));
      }
      for (const listId of changes.removedListIds) {
        const { error } = await removeMovieFromList(listId, id);
        if (error) throw error;
        markSaved((saved) => ({ ...saved, listIds: setMembership(saved.listIds, listId, false) }));
      }
      setSaveNotice(pendingOnPhone ? 'pending' : 'saved');
      return true;
    } catch (err) {
      showAlert('No se pudieron guardar los cambios', errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Pasar a Terminado registra la vista de hoy. Si falla, el estado ya quedó
  // guardado: solo se avisa y la vista se puede registrar a mano.
  async function registerFinishView(id: number) {
    try {
      await registerAutoViewToday(id);
    } catch (err) {
      showAlert('No se pudo registrar la vista', errorMessage(err));
    }
  }

  // Crea el título de TheMovieDB en movies la primera vez que se guarda algo y
  // recuerda el id. Las vistas descartan la recarga que eso dispara mientras
  // su escritura sigue en curso.
  async function ensureInternalMovieId() {
    if (internalId != null) return internalId;
    if (!tmdbDetails) throw new Error('Todavía no se cargó el título.');
    const id = await ensureMovieFromTmdb(tmdbDetails);
    setTmdbInternalId(id);
    return id;
  }

  async function handleAddView(viewedOn: string) {
    await registerView(await ensureInternalMovieId(), viewedOn);
  }

  // La nota sube al tope de la pantalla para que el teclado no tape lo que se
  // escribe.
  function revealNote() {
    scrollRef.current?.scrollTo({ y: Math.max(noteY.current - NOTE_REVEAL_MARGIN, 0), animated: true });
  }

  // Al abrirse el teclado, KeyboardAvoidingView achica el ScrollView: recién
  // ahí la nota puede quedar arriba sin que el scroll llegue al final.
  function handleViewportLayout(event: LayoutChangeEvent) {
    const { height } = event.nativeEvent.layout;
    if (noteFocused && height < viewportHeight.current) revealNote();
    viewportHeight.current = height;
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  if (!movie || !review) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.emptyCopy}>No encontramos esta película.</Text>
      </SafeAreaView>
    );
  }

  const { draft } = review;
  const saveDisabled = !dirty || saving;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          maintainVisibleContentPosition={KEEP_VISIBLE_CONTENT}
          onLayout={handleViewportLayout}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            {/* En la fila del botón, de alto fijo: aparecer o irse no mueve la ficha. */}
            {showPending && (
              <View accessibilityLiveRegion="polite" style={styles.pendingPill}>
                <View style={styles.pendingDot} />
                <Text style={styles.pendingText}>Pendiente de sincronizar</Text>
              </View>
            )}
          </View>

          <View style={styles.posterWrap}>
            <GoldenPoster posterUrl={movie.posterUrl} title={movie.title} rating={draft.rating} size={180} />
          </View>
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
          <StatusPicker value={draft.status} onChange={(status) => updateDraft((current) => ({ ...current, status }))} />

          <Text style={styles.sectionLabel}>Vistas</Text>
          <ViewsSection views={views} onAdd={handleAddView} onDelete={removeView} />

          <Text style={styles.sectionLabel}>Calificación</Text>
          <View style={styles.ratingRow}>
            <StarRatingInput value={draft.rating} onChange={(rating) => updateDraft((current) => rateDraft(current, rating))} />
            <ReactionPicker
              selectedIds={draft.reactionIds}
              onToggle={(reactionId) =>
                updateDraft((current) => ({ ...current, reactionIds: toggleId(current.reactionIds, reactionId) }))
              }
            />
          </View>

          {draft.status == null ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyCopy}>Elige un estado o califica para escribir una nota.</Text>
            </View>
          ) : (
            <View
              style={styles.noteBlock}
              onLayout={(event) => {
                noteY.current = event.nativeEvent.layout.y;
              }}>
              <Text style={styles.sectionLabel}>Nota privada</Text>
              <TextInput
                value={draft.notes}
                onChangeText={(notes) => updateDraft((current) => ({ ...current, notes }))}
                onFocus={() => {
                  setNoteFocused(true);
                  // Con el teclado ya abierto el alto no cambia: se lleva ahora.
                  if (Keyboard.isVisible()) revealNote();
                }}
                onBlur={() => setNoteFocused(false)}
                multiline
                maxLength={NOTES_MAX}
                accessibilityLabel="Nota privada"
                placeholder="Solo tú puedes leer esta nota…"
                placeholderTextColor="#7D7382"
                style={styles.noteInput}
              />
              <View style={styles.noteFooter}>
                <Text style={styles.noteCounter}>
                  {draft.notes.length} / {NOTES_MAX}
                </Text>
                {noteFocused && (
                  <Pressable accessibilityRole="button" hitSlop={10} onPress={() => Keyboard.dismiss()}>
                    <Text style={styles.doneText}>Listo</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          <Text style={styles.sectionLabel}>Listas</Text>
          <MovieListsPicker
            selectedIds={draft.listIds}
            onToggle={(listId) => updateDraft((current) => ({ ...current, listIds: toggleId(current.listIds, listId) }))}
          />

          <View style={styles.saveSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saveDisabled }}
              disabled={saveDisabled}
              onPress={handleSave}
              style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}>
              <Text style={styles.saveButtonText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.saveNotice}>
              {saveNoticeText(dirty, saveNotice)}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  flex: { flex: 1 },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  posterWrap: { alignSelf: 'center', marginBottom: 14 },
  title: { color: '#F4F4F5', fontSize: 23, fontWeight: '800' },
  overview: { color: '#A1A1AA', fontSize: 14, lineHeight: 20, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 18, alignItems: 'center' },
  genrePill: { backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  genrePillText: { color: '#D78CFF', fontSize: 12, fontWeight: '700' },
  durationText: { color: '#81788A', fontSize: 12 },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: '#A16207' },
  pendingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FBBF24' },
  pendingText: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },
  sectionLabel: { color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 16 },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
  noteBlock: { gap: 6 },
  // Con tope de alto la nota larga se desplaza por dentro y el cursor queda a la vista.
  noteInput: { minHeight: 120, maxHeight: 220, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 14, padding: 14, color: '#F4F4F5', fontSize: 14, textAlignVertical: 'top' },
  // Alto fijo: el botón Listo aparece sin mover lo de abajo.
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, marginTop: 6 },
  noteCounter: { color: '#7D7382', fontSize: 11 },
  doneText: { color: '#D78CFF', fontSize: 13, fontWeight: '800' },
  saveSection: { marginTop: 28, gap: 10 },
  saveButton: { alignItems: 'center', paddingVertical: 15, borderRadius: 14, backgroundColor: '#A83BDD' },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  saveNotice: { color: '#A1A1AA', fontSize: 12, lineHeight: 18, minHeight: 18, textAlign: 'center' },
});
