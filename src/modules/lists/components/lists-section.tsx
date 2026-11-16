import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth/context/AuthContext';
import { getLists, ListSummary } from '@/modules/lists/api/lists';
import { listKindLabel } from '@/modules/lists/constants/kinds';
import { errorMessage, showAlert } from '@/utils/alert';

/**
 * Vista previa de las listas en Inicio. Crear, renombrar y ordenar se hace en
 * Mis listas: así Inicio no tiene formularios y queda solo para encontrar.
 */
export function ListsSection() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [lists, setLists] = useState<ListSummary[]>([]);

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

  const openAll = () => router.push('/lists');
  const createNew = () => router.push({ pathname: '/lists', params: { nueva: '1' } });

  return (
    <View style={styles.section} accessibilityLabel={`Mis listas, ${lists.length === 1 ? '1 lista' : `${lists.length} listas`}`}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Mis listas</Text>
        {lists.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Ver todas las listas" onPress={openAll} hitSlop={10}>
            <Text style={styles.link}>Ver todas ›</Text>
          </Pressable>
        )}
      </View>

      {lists.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {lists.map((list) => (
            <Pressable
              key={list.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/list/[id]', params: { id: String(list.id) } })}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <Text numberOfLines={2} style={styles.cardName}>
                {list.name}
              </Text>
              <Text style={styles.cardCount}>
                {listKindLabel(list.kind)} · {list.movieCount === 1 ? '1 título' : `${list.movieCount} títulos`}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear lista"
            onPress={createNew}
            style={({ pressed }) => [styles.newCard, pressed && styles.cardPressed]}>
            <Text style={styles.newIcon}>+</Text>
            <Text style={styles.newText}>Nueva lista</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Todavía no tienes listas</Text>
          <Text style={styles.emptyCopy}>Agrupa tus películas por tema, saga o lo que quieras.</Text>
          <Pressable accessibilityRole="button" onPress={createNew} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Crear lista</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  link: { color: '#D78CFF', fontSize: 13, fontWeight: '700' },
  row: { gap: 12 },
  card: { width: 150, minHeight: 92, padding: 14, borderRadius: 15, backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653', justifyContent: 'space-between' },
  cardPressed: { opacity: 0.8 },
  cardName: { color: '#F4F4F5', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  cardCount: { color: '#D78CFF', fontSize: 12, fontWeight: '600', marginTop: 10 },
  newCard: { width: 110, minHeight: 92, padding: 14, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4D3A5A', alignItems: 'center', justifyContent: 'center', gap: 4 },
  newIcon: { color: '#D78CFF', fontSize: 24, lineHeight: 26, fontWeight: '700' },
  newText: { color: '#D5D0D8', fontSize: 12, fontWeight: '700' },
  emptyPanel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18 },
  emptyTitle: { color: '#F4F4F5', fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19, marginTop: 6 },
  emptyButton: { alignSelf: 'flex-start', marginTop: 14, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#A83BDD' },
  emptyButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
