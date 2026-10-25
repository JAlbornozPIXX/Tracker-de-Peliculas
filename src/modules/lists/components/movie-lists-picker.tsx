import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth/context/AuthContext';
import { getLists, ListSummary } from '@/modules/lists/api/lists';
import { errorMessage, showAlert } from '@/utils/alert';

/**
 * Chips para elegir en qué listas del usuario va el título. Solo marca la
 * selección: la ficha la guarda al tocar Guardar.
 */
export function MovieListsPicker({
  selectedIds,
  onToggle,
}: {
  selectedIds: number[];
  onToggle: (listId: number) => void;
}) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [lists, setLists] = useState<ListSummary[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getLists(userId)
      .then((userLists) => {
        if (active) setLists(userLists);
      })
      .catch((err) => showAlert('No se pudieron cargar tus listas', errorMessage(err)));
    return () => {
      active = false;
    };
  }, [userId]);

  if (!lists) return null;

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
            onPress={() => onToggle(list.id)}
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
