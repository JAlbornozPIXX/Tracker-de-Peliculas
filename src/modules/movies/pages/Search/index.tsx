import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/bottom-bar';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { MovieResultCard } from '@/modules/movies/components/movie-result-card';
import {
  Genre,
  MovieResult,
  TmdbConfigError,
  discoverMoviesByGenres,
  getMovieGenres,
  searchMovies,
} from '@/modules/movies/api/tmdb';

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreController = useRef<AbortController | null>(null);

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(focusTimeout);
  }, []);

  // Sin categorías la búsqueda por texto sigue funcionando, así que un fallo
  // aquí no se muestra como error.
  useEffect(() => {
    const controller = new AbortController();
    getMovieGenres(controller.signal)
      .then(setGenres)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Con texto se busca por nombre (filtrando por las categorías elegidas, si
  // hay); solo con categorías se muestran sus películas más populares.
  const fetchPage = useCallback(
    (pageNumber: number, signal: AbortSignal) =>
      debouncedQuery.length >= MIN_QUERY_LENGTH
        ? searchMovies(debouncedQuery, signal, selectedGenreIds, pageNumber)
        : discoverMoviesByGenres(selectedGenreIds, signal, pageNumber),
    [debouncedQuery, selectedGenreIds]
  );

  // Una búsqueda nueva (otro texto u otras categorías) empieza de cero. Se
  // ajusta durante el render y no en el efecto, así no se pinta un instante
  // con los resultados de la búsqueda anterior.
  const hasActiveSearch = debouncedQuery.length >= MIN_QUERY_LENGTH || selectedGenreIds.length > 0;
  const searchKey = `${debouncedQuery}|${selectedGenreIds.join(',')}`;
  const [currentSearch, setCurrentSearch] = useState(searchKey);
  if (searchKey !== currentSearch) {
    setCurrentSearch(searchKey);
    setResults([]);
    setPage(1);
    setTotalPages(0);
    setLoadingMore(false);
    setError(null);
    setLoading(hasActiveSearch);
  }

  useEffect(() => {
    // Una búsqueda nueva descarta cualquier página siguiente en camino.
    loadMoreController.current?.abort();
    if (debouncedQuery.length < MIN_QUERY_LENGTH && selectedGenreIds.length === 0) return;

    const controller = new AbortController();
    fetchPage(1, controller.signal)
      .then((firstPage) => {
        if (controller.signal.aborted) return;
        setResults(firstPage.results);
        setTotalPages(firstPage.totalPages);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setResults([]);
        setError(
          err instanceof TmdbConfigError
            ? err.message
            : 'No se pudo completar la búsqueda. Intenta nuevamente.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, selectedGenreIds, fetchPage]);

  // Al llegar al final de la lista se pide la página siguiente y se agrega
  // debajo de lo que ya está en pantalla.
  function handleLoadMore() {
    if (loading || loadingMore || results.length === 0 || page >= totalPages) return;

    const controller = new AbortController();
    loadMoreController.current = controller;
    const nextPage = page + 1;
    setLoadingMore(true);

    fetchPage(nextPage, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setPage(nextPage);
        setResults((current) => {
          const seen = new Set(current.map((item) => `${item.mediaType}-${item.id}`));
          return [...current, ...next.results.filter((item) => !seen.has(`${item.mediaType}-${item.id}`))];
        });
      })
      // Si falla, se conserva lo ya cargado y se puede reintentar deslizando.
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoadingMore(false);
      });
  }

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    router.back();
  }, [router]);

  const hasDebouncedQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const hasGenres = selectedGenreIds.length > 0;
  const showHint = !hasGenres && trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;
  const showEmptyState =
    !loading && !error && !showHint && (hasDebouncedQuery || hasGenres) && results.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={handleClose}
          style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar películas y series"
            placeholderTextColor="#7D7382"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Buscar películas y series"
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={handleClear}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {genres.length > 0 && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.genreRow}>
            {genres.map((genre) => {
              const active = selectedGenreIds.includes(genre.id);
              return (
                <Pressable
                  key={genre.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Categoría ${genre.name}`}
                  onPress={() =>
                    setSelectedGenreIds((current) =>
                      active ? current.filter((id) => id !== genre.id) : [...current, genre.id]
                    )
                  }
                  style={[styles.genreChip, active && styles.genreChipActive]}>
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{genre.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        renderItem={({ item }) => (
          <MovieResultCard
            movie={item}
            onPress={() =>
              router.push({
                pathname: '/movie/[id]',
                params: { id: String(item.id), mediaType: item.mediaType },
              })
            }
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + BOTTOM_BAR_SPACE }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color="#B94DFF" style={styles.footerSpinner} /> : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#B94DFF" size="large" style={styles.stateSpacing} />
          ) : error ? (
            <Text style={[styles.stateText, styles.errorText, styles.stateSpacing]}>{error}</Text>
          ) : showEmptyState ? (
            <Text style={[styles.stateText, styles.stateSpacing]}>
              {hasDebouncedQuery
                ? `No encontramos resultados para “${debouncedQuery}”${hasGenres ? (selectedGenreIds.length === 1 ? ' en esta categoría' : ' en estas categorías') : ''}.`
                : selectedGenreIds.length === 1
                  ? 'No encontramos títulos en esta categoría.'
                  : 'No encontramos títulos que estén en todas estas categorías.'}
            </Text>
          ) : showHint ? (
            <Text style={[styles.stateText, styles.stateSpacing]}>
              Escribe al menos {MIN_QUERY_LENGTH} letras para buscar.
            </Text>
          ) : (
            <Text style={[styles.stateText, styles.stateSpacing]}>
              Busca tus películas y series favoritas de TheMovieDB o elige una categoría.
            </Text>
          )
        }
      />

      <BottomBar active="search" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#17151D',
    borderWidth: 1,
    borderColor: '#292431',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#17151D',
    borderWidth: 1,
    borderColor: '#292431',
  },
  searchIcon: { color: '#D78CFF', fontSize: 17 },
  searchInput: { flex: 1, height: '100%', color: '#F4F4F5', fontSize: 15 },
  clearIcon: { color: '#7D7382', fontSize: 15, paddingLeft: 6 },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  genreRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  genreChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  genreChipActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  genreChipText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  genreChipTextActive: { color: '#F4F4F5', fontWeight: '800' },
  separator: { height: 12 },
  footerSpinner: { marginTop: 20 },
  stateSpacing: { marginTop: 60 },
  stateText: { color: '#8F8795', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#F87171' },
});
