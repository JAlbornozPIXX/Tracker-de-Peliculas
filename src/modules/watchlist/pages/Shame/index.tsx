import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyNotice } from '@/components/empty-notice';
import { HomeBackButton } from '@/components/home-back-button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import {
  getShamePile,
  keepInWatchlist,
  moveToSomedayList,
  removeTracking,
  restoreTracking,
  ShameMovie,
  SOMEDAY_LIST_NAME,
  undoMove,
} from '@/modules/watchlist/api/shame';
import { SwipeCard } from '@/modules/watchlist/components/swipe-card';
import { isDeckDone, putBack, takeTop } from '@/modules/watchlist/utils/deck';
import { SHAME_MIN_DAYS } from '@/modules/watchlist/utils/shame';

const UNDO_MS = 5000;

type Undo = { message: string; card: ShameMovie; run: () => Promise<void> };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '';
}

export default function Shame() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<ShameMovie[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  // Cambia para volver a montar la tarjeta en el centro si una acción falla.
  const [cardKey, setCardKey] = useState(0);

  const current = cards[0];

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getShamePile(userId)
      .then((data) => {
        if (!active) return;
        setCards(data);
        setTotal(data.length);
      })
      .catch((err) => Alert.alert('No se pudo cargar la pila', errorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  // "Deshacer" queda visible 5 segundos; después el borrado es definitivo.
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  // Al terminar la pila se vuelve a Inicio (si estaba vacía se queda el aviso).
  useEffect(() => {
    if (!loading && total > 0 && isDeckDone(cards, undo != null)) router.dismissTo('/explore');
  }, [loading, total, cards, undo, router]);

  async function act(action: () => Promise<Undo | null>, errorTitle: string) {
    if (busy) return;
    setBusy(true);
    try {
      const nextUndo = await action();
      setCards(takeTop);
      setUndo(nextUndo);
    } catch (err) {
      Alert.alert(errorTitle, errorMessage(err));
      setCardKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  function keep() {
    if (!userId || !current) return;
    act(async () => {
      await keepInWatchlist(userId, current.id);
      return null;
    }, 'No se pudo mantener la película');
  }

  function confirmDelete() {
    if (!userId || !current) return;
    setSheetOpen(false);
    Alert.alert(
      `¿Borrar ${current.title}?`,
      'Sale de Ver más tarde y pierde su estado, nota y estrellas. Sigue en tus listas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () =>
            act(async () => {
              const snapshot = await removeTracking(userId, current.id);
              return { message: 'Película borrada', card: current, run: () => restoreTracking(userId, current.id, snapshot) };
            }, 'No se pudo borrar la película'),
        },
      ]
    );
  }

  function move() {
    if (!userId || !current) return;
    setSheetOpen(false);
    act(async () => {
      const result = await moveToSomedayList(userId, current.id);
      return { message: `Movida a ${SOMEDAY_LIST_NAME}`, card: current, run: () => undoMove(userId, current.id, result) };
    }, 'No se pudo mover la película');
  }

  async function runUndo() {
    if (!undo || busy) return;
    setBusy(true);
    try {
      await undo.run();
      setCards((prev) => putBack(prev, undo.card));
      setUndo(null);
    } catch (err) {
      Alert.alert('No se pudo deshacer', errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  const position = total - cards.length + 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <HomeBackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>Pila de la vergüenza</Text>
          <Text style={styles.count}>
            {current ? `${position} de ${total} · ${SHAME_MIN_DAYS} días o más en Ver más tarde` : 'Repaso terminado'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {current ? (
          <>
            <Text style={styles.hint}>Desliza a la derecha para mantenerla o a la izquierda para quitarla.</Text>
            <SwipeCard key={`${current.id}-${cardKey}`} movie={current} onKeep={keep} onLeft={() => setSheetOpen(true)} />
            {/* Alternativa al gesto para lectores de pantalla y quien no pueda deslizar. */}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${current.title}`}
                accessibilityHint="Abre las opciones para borrarla o moverla a otra lista"
                disabled={busy}
                onPress={() => setSheetOpen(true)}
                style={[styles.actionButton, styles.leftButton]}>
                <Text style={styles.leftButtonText}>‹ Quitar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mantener ${current.title}`}
                accessibilityHint={`Sigue en Ver más tarde y su contador vuelve a cero por ${SHAME_MIN_DAYS} días`}
                disabled={busy}
                onPress={keep}
                style={[styles.actionButton, styles.keepButton]}>
                <Text style={styles.keepButtonText}>Mantener ›</Text>
              </Pressable>
            </View>
          </>
        ) : (
          total === 0 && (
            <EmptyNotice
              title="Watchlist al día 🎉"
              copy={`Ninguna película lleva ${SHAME_MIN_DAYS} días o más en Ver más tarde.`}
            />
          )
        )}
      </View>

      {undo && (
        <View accessibilityLiveRegion="polite" style={[styles.toast, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.toastText}>{undo.message}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={runUndo} hitSlop={8}>
            <Text style={styles.toastAction}>Deshacer</Text>
          </Pressable>
        </View>
      )}

      <Modal
        transparent
        statusBarTranslucent
        animationType="slide"
        visible={sheetOpen}
        onRequestClose={() => setSheetOpen(false)}>
        <Pressable accessibilityLabel="Cerrar opciones" onPress={() => setSheetOpen(false)} style={styles.backdrop} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.sheetTitle}>{current?.title}</Text>
          <Pressable accessibilityRole="button" onPress={move} style={styles.sheetOption}>
            <Text style={styles.sheetOptionText}>Mover a lista</Text>
            <Text style={styles.sheetOptionCopy}>
              Sale de Ver más tarde y queda en “{SOMEDAY_LIST_NAME}” (se crea si no existe).
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.sheetOption}>
            <Text style={[styles.sheetOptionText, styles.danger]}>Borrar</Text>
            <Text style={styles.sheetOptionCopy}>Quita su seguimiento. Sigue en tus listas.</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setSheetOpen(false)} style={styles.sheetCancel}>
            <Text style={styles.sheetCancelText}>Cancelar</Text>
          </Pressable>
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
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  hint: { color: '#8F8795', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  leftButton: { backgroundColor: '#2A1416', borderColor: '#5C2A2E' },
  leftButtonText: { color: '#F87171', fontSize: 15, fontWeight: '800' },
  keepButton: { backgroundColor: '#12261A', borderColor: '#24502F' },
  keepButtonText: { color: '#4ADE80', fontSize: 15, fontWeight: '800' },
  toast: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#29262F', borderWidth: 1, borderColor: '#47414D' },
  toastText: { color: '#F4F4F5', fontSize: 14, fontWeight: '600' },
  toastAction: { color: '#D78CFF', fontSize: 14, fontWeight: '800' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431', gap: 10 },
  sheetTitle: { color: '#F4F4F5', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sheetOption: { padding: 14, borderRadius: 14, backgroundColor: '#15131A', borderWidth: 1, borderColor: '#27222D', gap: 4 },
  sheetOptionText: { color: '#F4F4F5', fontSize: 15, fontWeight: '800' },
  sheetOptionCopy: { color: '#8F8795', fontSize: 12, lineHeight: 17 },
  danger: { color: '#F87171' },
  sheetCancel: { alignItems: 'center', paddingVertical: 12 },
  sheetCancelText: { color: '#A1A1AA', fontSize: 14, fontWeight: '700' },
});
