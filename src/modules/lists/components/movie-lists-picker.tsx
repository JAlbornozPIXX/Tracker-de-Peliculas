import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useWriteTracker } from '@/hooks/use-write-tracker';
import { useAuth } from '@/modules/auth/context/AuthContext';
import {
  addMovieToList,
  getListIdsForMovie,
  getLists,
  ListSummary,
  removeMovieFromList,
} from '@/modules/lists/api/lists';

/**
 * Chips para agregar o quitar un título de las listas del usuario.
 * movieId es el id interno de movies, o null si el título todavía no existe
 * ahí; en ese caso ensureMovieId lo crea al agregarlo a la primera lista.
 */
export function MovieListsPicker({
  movieId,
  ensureMovieId,
}: {
  movieId: number | null;
  ensureMovieId: () => Promise<number>;
}) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [lists, setLists] = useState<ListSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const writes = useWriteTracker();

  // movieId cambia de null al id nuevo durante el primer cambio de un título
  // de TheMovieDB: esa carga se cruza con la escritura y no debe pisarla.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const snapshot = writes.snapshot();
    Promise.all([getLists(userId), movieId != null ? getListIdsForMovie(movieId) : []])
      .then(([userLists, listIds]) => {
        if (!active) return;
        setLists(userLists);
        if (writes.isQuietSince(snapshot)) setSelectedIds(listIds);
        setLoaded(true);
      })
      .catch((err) => Alert.alert('No se pudieron cargar tus listas', err instanceof Error ? err.message : ''));
    return () => {
      active = false;
    };
  }, [userId, movieId, writes]);

  async function handleToggle(listId: number) {
    const wasSelected = selectedIds.includes(listId);
    setSelectedIds((current) => (wasSelected ? current.filter((id) => id !== listId) : [...current, listId]));

    try {
      await writes.track(async () => {
        const resolvedMovieId = movieId ?? (await ensureMovieId());
        const { error } = wasSelected
          ? await removeMovieFromList(listId, resolvedMovieId)
          : await addMovieToList(listId, resolvedMovieId);
        if (error) throw error;
      });
    } catch (err) {
      setSelectedIds((current) => (wasSelected ? [...current, listId] : current.filter((id) => id !== listId)));
      Alert.alert(
        wasSelected ? 'No se pudo quitar de la lista' : 'No se pudo agregar a la lista',
        err instanceof Error ? err.message : ''
      );
    }
  }

  if (!loaded) return null;

  if (lists.length === 0) {
    return (
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyCopy}>Crea una lista en la página principal para agregar este título.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {lists.map((list) => {
        const active = selectedIds.includes(list.id);
        return (
          <Pressable
            key={list.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={list.name}
            onPress={() => handleToggle(list.id)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {active ? '✓ ' : '+ '}
              {list.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  chipActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  chipText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#F4F4F5', fontWeight: '800' },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 16 },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19 },
});
