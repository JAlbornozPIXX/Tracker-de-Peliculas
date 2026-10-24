import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chips } from '@/components/chips';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { createList, getLists, LIST_NAME_MAX, ListSummary } from '@/modules/lists/api/lists';
import { DEFAULT_LIST_KIND, LIST_KINDS, ListKind, listKindLabel } from '@/modules/lists/constants/kinds';
import { errorMessage, showAlert } from '@/utils/alert';

export function ListsSection() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [lists, setLists] = useState<ListSummary[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ListKind>(DEFAULT_LIST_KIND);
  const [creating, setCreating] = useState(false);

  // Se recarga al volver a la pantalla para reflejar títulos agregados o
  // listas eliminadas desde otras pantallas.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      getLists(userId)
        .then((data) => active && setLists(data))
        .catch((err) => showAlert('No se pudieron cargar tus listas', errorMessage(err)));
      return () => {
        active = false;
      };
    }, [userId])
  );

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0 && !creating;

  async function handleCreate() {
    if (!userId || !canCreate) return;
    setCreating(true);
    const { data, error } = await createList(userId, trimmedName, kind);
    setCreating(false);

    if (error) {
      showAlert('No se pudo crear la lista', error.message);
      return;
    }
    setLists((current) => [...current, { id: data.id, name: data.name, kind: data.kind, movieCount: 0 }]);
    setName('');
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mis listas</Text>
        <Text style={styles.count}>{lists.length === 1 ? '1 lista' : `${lists.length} listas`}</Text>
      </View>

      <View style={styles.createRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={LIST_NAME_MAX}
          placeholder="Nombre de la nueva lista"
          placeholderTextColor="#7D7382"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          accessibilityLabel="Nombre de la nueva lista"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Crear lista"
          accessibilityState={{ disabled: !canCreate }}
          disabled={!canCreate}
          onPress={handleCreate}
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}>
          <Text style={styles.createButtonText}>Crear</Text>
        </Pressable>
      </View>
      <View style={styles.kindRow}>
        <Chips options={LIST_KINDS} value={kind} onChange={setKind} scroll />
      </View>

      {lists.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {lists.map((list) => (
            <Pressable
              key={list.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/list/[id]', params: { id: String(list.id) } })}
              style={styles.card}>
              <Text numberOfLines={2} style={styles.cardName}>
                {list.name}
              </Text>
              <Text style={styles.cardCount}>
                {listKindLabel(list.kind)} · {list.movieCount === 1 ? '1 título' : `${list.movieCount} títulos`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Todavía no tienes listas</Text>
          <Text style={styles.emptyCopy}>Crea una y agrega títulos desde el detalle de cada película.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  count: { color: '#7D7382', fontSize: 12 },
  createRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kindRow: { marginBottom: 14 },
  input: { flex: 1, height: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', color: '#F4F4F5', fontSize: 14 },
  createButton: { height: 46, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#A83BDD', alignItems: 'center', justifyContent: 'center' },
  createButtonDisabled: { opacity: 0.45 },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  row: { gap: 12 },
  card: { width: 150, minHeight: 92, padding: 14, borderRadius: 15, backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653', justifyContent: 'space-between' },
  cardName: { color: '#F4F4F5', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  cardCount: { color: '#D78CFF', fontSize: 12, fontWeight: '600', marginTop: 10 },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18 },
  emptyTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19, marginTop: 6 },
});
