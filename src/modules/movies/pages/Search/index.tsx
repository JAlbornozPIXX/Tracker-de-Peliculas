import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { MovieResultCard } from '@/modules/movies/components/movie-result-card';
import { MovieResult, TmdbConfigError, searchMovies } from '@/modules/movies/api/tmdb';

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

export default function Search() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(focusTimeout);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setResults([]);

    searchMovies(debouncedQuery, controller.signal)
      .then((movies) => {
        setResults(movies);
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
  }, [debouncedQuery]);

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

  const showHint = trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;
  const showEmptyState =
    !loading && !error && !showHint && debouncedQuery.length >= MIN_QUERY_LENGTH && results.length === 0;

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

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.mediaType}-${item.id}`}
        renderItem={({ item }) => <MovieResultCard movie={item} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color="#B94DFF" size="large" style={styles.stateSpacing} />
          ) : error ? (
            <Text style={[styles.stateText, styles.errorText, styles.stateSpacing]}>{error}</Text>
          ) : showEmptyState ? (
            <Text style={[styles.stateText, styles.stateSpacing]}>
              No encontramos resultados para “{debouncedQuery}”.
            </Text>
          ) : showHint ? (
            <Text style={[styles.stateText, styles.stateSpacing]}>
              Escribe al menos {MIN_QUERY_LENGTH} letras para buscar.
            </Text>
          ) : (
            <Text style={[styles.stateText, styles.stateSpacing]}>
              Busca tus películas y series favoritas de TheMovieDB.
            </Text>
          )
        }
      />
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
  separator: { height: 12 },
  stateSpacing: { marginTop: 60 },
  stateText: { color: '#8F8795', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#F87171' },
});
