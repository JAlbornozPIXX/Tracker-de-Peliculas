import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipOption, Chips } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import { GoldenPoster } from '@/components/golden-poster';
import { HomeBackButton } from '@/components/home-back-button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getLists, ListSummary } from '@/modules/lists/api/lists';
import { getReactions, Reaction } from '@/modules/movies/api/reactions';
import { formatViewDate } from '@/modules/movies/utils/view-date';
import { getRankedMovies } from '@/modules/ranking/api/ranking';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filterRanking,
  formatRating,
  rankingFacets,
  RankedMovie,
  RankingFilters,
  sortRanking,
} from '@/modules/ranking/utils/ranking';

const POSTER_SIZE = 64;

const STAR_OPTIONS: ChipOption<number | null>[] = [
  { key: null, label: 'Todas' },
  { key: 1, label: '1★ o más' },
  { key: 2, label: '2★ o más' },
  { key: 3, label: '3★ o más' },
  { key: 4, label: '4★ o más' },
  { key: 5, label: '5★' },
];

function RankingRow({ movie, position, onPress }: { movie: RankedMovie; position: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Puesto ${position}: ${movie.title}, ${formatRating(movie.rating)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.position}>{position}</Text>
      <GoldenPoster posterUrl={movie.posterUrl} title={movie.title} rating={movie.rating} size={POSTER_SIZE} />
      <View style={styles.rowInfo}>
        <Text numberOfLines={2} style={styles.rowTitle}>
          {movie.title}
        </Text>
        <Text numberOfLines={1} style={styles.rowMeta}>
          {[movie.releaseYear, ...movie.genres.slice(0, 2)].filter(Boolean).join(' · ') || 'Sin datos de estreno'}
        </Text>
        <View style={styles.rowFooter}>
          <Text style={styles.rating}>{formatRating(movie.rating)}</Text>
          {movie.lastViewedOn && <Text style={styles.lastView}>Vista {formatViewDate(movie.lastViewedOn)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

function FilterGroup<K extends string | number | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption<K>[];
  value: K;
  onChange: (next: K) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Chips options={options} value={value} onChange={onChange} scroll />
    </View>
  );
}

export default function Ranking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [movies, setMovies] = useState<RankedMovie[]>([]);
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [filters, setFilters] = useState<RankingFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Se recarga al volver de la ficha, donde puede cambiar la nota.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      Promise.all([getRankedMovies(userId), getLists(userId), getReactions()])
        .then(([rankedData, listData, reactionData]) => {
          if (!active) return;
          setMovies(rankedData);
          setLists(listData);
          setReactions(reactionData);
        })
        .catch((err) => Alert.alert('No se pudo cargar el ranking', err instanceof Error ? err.message : ''))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const facets = useMemo(() => rankingFacets(movies), [movies]);
  const results = useMemo(() => sortRanking(filterRanking(movies, filters)), [movies, filters]);
  const filterCount = activeFilterCount(filters);

  // Solo se ofrecen etiquetas y listas que aparecen en alguna película puntuada.
  const usedReactions = reactions.filter((reaction) => movies.some((movie) => movie.reactionIds.includes(reaction.id)));
  const usedLists = lists.filter((list) => movies.some((movie) => movie.listIds.includes(list.id)));

  const summary = [
    filters.minStars != null && STAR_OPTIONS.find((option) => option.key === filters.minStars)?.label,
    filters.year,
    filters.genre,
    filters.listId != null && lists.find((list) => list.id === filters.listId)?.name,
    filters.reactionId != null && reactions.find((reaction) => reaction.id === filters.reactionId)?.name,
  ].filter(Boolean);

  function setFilter<Key extends keyof RankingFilters>(key: Key, value: RankingFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

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
        <HomeBackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.count}>{results.length === 1 ? '1 película' : `${results.length} películas`}</Text>
        </View>
        {movies.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filterCount > 0 ? `Filtros, ${filterCount} activos` : 'Filtros'}
            onPress={() => setFiltersOpen(true)}
            style={[styles.filterButton, filterCount > 0 && styles.filterButtonActive]}>
            <Text style={styles.filterButtonText}>Filtros{filterCount > 0 ? ` · ${filterCount}` : ''}</Text>
          </Pressable>
        )}
      </View>

      {summary.length > 0 && (
        <View style={styles.summaryRow}>
          <Text numberOfLines={1} style={styles.summaryText}>
            {summary.join(' · ')}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setFilters(EMPTY_FILTERS)} hitSlop={8}>
            <Text style={styles.clearText}>Limpiar</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <RankingRow
            movie={item}
            position={index + 1}
            onPress={() => router.push({ pathname: '/movie/[id]', params: { id: String(item.id) } })}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          movies.length === 0 ? (
            <EmptyNotice
              title="Todavía no puntúas películas"
              copy="Califica una película desde su ficha para que aparezca en tu ranking."
              actionLabel="Buscar películas"
              onAction={() => router.push('/search')}
            />
          ) : (
            <EmptyNotice
              title="Sin resultados"
              copy="Ninguna película puntuada coincide con estos filtros."
              actionLabel="Cambiar filtros"
              onAction={() => setFiltersOpen(true)}
            />
          )
        }
      />

      <Modal
        transparent
        statusBarTranslucent
        animationType="slide"
        visible={filtersOpen}
        onRequestClose={() => setFiltersOpen(false)}>
        <Pressable accessibilityLabel="Cerrar filtros" onPress={() => setFiltersOpen(false)} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.sheetTitle}>Filtros</Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <FilterGroup
              label="Estrellas mínimas"
              options={STAR_OPTIONS}
              value={filters.minStars}
              onChange={(value) => setFilter('minStars', value)}
            />
            {facets.years.length > 0 && (
              <FilterGroup
                label="Año de estreno"
                options={[{ key: null, label: 'Todos' }, ...facets.years.map((year) => ({ key: year, label: String(year) }))]}
                value={filters.year}
                onChange={(value) => setFilter('year', value)}
              />
            )}
            {facets.genres.length > 0 && (
              <FilterGroup
                label="Género"
                options={[{ key: null, label: 'Todos' }, ...facets.genres.map((genre) => ({ key: genre, label: genre }))]}
                value={filters.genre}
                onChange={(value) => setFilter('genre', value)}
              />
            )}
            {usedLists.length > 0 && (
              <FilterGroup
                label="Lista"
                options={[{ key: null, label: 'Todas' }, ...usedLists.map((list) => ({ key: list.id, label: list.name }))]}
                value={filters.listId}
                onChange={(value) => setFilter('listId', value)}
              />
            )}
            {usedReactions.length > 0 && (
              <FilterGroup
                label="Etiqueta"
                options={[
                  { key: null, label: 'Todas' },
                  ...usedReactions.map((reaction) => ({ key: reaction.id, label: `${reaction.emoji} ${reaction.name}` })),
                ]}
                value={filters.reactionId}
                onChange={(value) => setFilter('reactionId', value)}
              />
            )}
          </ScrollView>
          <View style={styles.sheetActions}>
            <Pressable accessibilityRole="button" onPress={() => setFilters(EMPTY_FILTERS)} style={styles.sheetButton}>
              <Text style={styles.sheetButtonText}>Limpiar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFiltersOpen(false)}
              style={[styles.sheetButton, styles.sheetButtonPrimary]}>
              <Text style={[styles.sheetButtonText, styles.sheetButtonPrimaryText]}>
                {results.length === 1 ? 'Ver 1 resultado' : `Ver ${results.length} resultados`}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerText: { flex: 1 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  count: { color: '#7D7382', fontSize: 12, marginTop: 2 },
  filterButton: { height: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  filterButtonActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  filterButtonText: { color: '#F4F4F5', fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  summaryText: { flex: 1, color: '#D78CFF', fontSize: 12, fontWeight: '600' },
  clearText: { color: '#A1A1AA', fontSize: 12, fontWeight: '700' },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4 },
  separator: { height: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: '#15131A', borderWidth: 1, borderColor: '#27222D' },
  rowPressed: { backgroundColor: '#1C1822' },
  position: { width: 26, color: '#7D7382', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  rowInfo: { flex: 1, gap: 4 },
  rowTitle: { color: '#F4F4F5', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  rowMeta: { color: '#81788A', fontSize: 12 },
  rowFooter: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
  rating: { color: '#E8B64C', fontSize: 13, fontWeight: '800' },
  lastView: { color: '#7D7382', fontSize: 11 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', paddingTop: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  sheetTitle: { color: '#F4F4F5', fontSize: 18, fontWeight: '800', paddingHorizontal: 18, marginBottom: 8 },
  sheetContent: { paddingHorizontal: 18, paddingBottom: 8 },
  filterGroup: { marginTop: 14 },
  filterLabel: { color: '#D5D0D8', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 18, paddingTop: 14 },
  sheetButton: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  sheetButtonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  sheetButtonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  sheetButtonPrimaryText: { color: '#FFFFFF' },
});
