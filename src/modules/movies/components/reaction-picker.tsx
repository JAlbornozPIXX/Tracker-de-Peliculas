import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWriteTracker } from '@/hooks/use-write-tracker';
import { useAuth } from '@/modules/auth/context/AuthContext';
import {
  createReaction,
  getReactionIdsForMovie,
  getReactions,
  Reaction,
  REACTION_EMOJI_MAX,
  REACTION_NAME_MAX,
} from '@/modules/movies/api/reactions';
import { saveMovieReaction, syncQueue, withPendingReactions } from '@/modules/sync/queue';
import { errorMessage, showAlert } from '@/utils/alert';

const PREVIEW_COUNT = 3;

// Los marcados en el servidor más los cambios que siguen pendientes en el teléfono.
async function loadSelectedIds(userId: string, movieId: number) {
  return withPendingReactions(userId, movieId, await getReactionIdsForMovie(userId, movieId));
}

/**
 * Botón que muestra los calificadores marcados y abre un Modal para activar,
 * desactivar o crear calificadores. Cada cambio se guarda al instante.
 * movieId es el id interno de movies, o null si el título todavía no existe
 * ahí; en ese caso ensureMovieId lo crea al marcar el primer calificador.
 */
export function ReactionPicker({
  movieId,
  ensureMovieId,
}: {
  movieId: number | null;
  ensureMovieId: () => Promise<number>;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialog, setDialog] = useState<'none' | 'pick' | 'create'>('none');
  const [draftEmoji, setDraftEmoji] = useState('');
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const writes = useWriteTracker();

  const trimmedEmoji = draftEmoji.trim();
  const trimmedName = draftName.trim();
  const canCreate = trimmedEmoji.length > 0 && trimmedName.length > 0 && !saving;

  // movieId cambia de null al id nuevo durante la primera marca de un título
  // de TheMovieDB: esa carga no debe pisar la marca en curso, así que espera a
  // que termine (y se repite si se cruza con otra).
  useEffect(() => {
    if (!userId) return;
    return writes.loadWhenIdle(
      () => Promise.all([getReactions(), movieId != null ? loadSelectedIds(userId, movieId) : []]),
      ([allReactions, reactionIds]) => {
        setReactions(allReactions);
        setSelectedIds(reactionIds);
        setLoaded(true);
      },
      (err) => showAlert('No se pudieron cargar los calificadores', errorMessage(err))
    );
  }, [userId, movieId, writes]);

  // Un calificador pendiente que el servidor rechazó o que perdió contra un
  // cambio más reciente: se vuelve a lo guardado, cuando no quede una marca
  // en curso.
  useEffect(() => {
    if (!userId || movieId == null) return;
    let cancelReload = () => {};
    const unsubscribe = syncQueue.subscribeDiscarded((discardedId, kind) => {
      if (discardedId !== movieId || kind !== 'reaction') return;
      cancelReload();
      cancelReload = writes.loadWhenIdle(() => loadSelectedIds(userId, movieId), setSelectedIds);
    });
    return () => {
      unsubscribe();
      cancelReload();
    };
  }, [userId, movieId, writes]);

  async function handleToggle(reactionId: number) {
    if (!userId) return;
    const wasSelected = selectedIds.includes(reactionId);
    setSelectedIds((current) => (wasSelected ? current.filter((id) => id !== reactionId) : [...current, reactionId]));

    try {
      await writes.track(async () => {
        const resolvedMovieId = movieId ?? (await ensureMovieId());
        // Sin red queda pendiente en el teléfono; solo un rechazo del servidor lanza.
        await saveMovieReaction(userId, resolvedMovieId, reactionId, !wasSelected);
      });
    } catch (err) {
      setSelectedIds((current) => (wasSelected ? [...current, reactionId] : current.filter((id) => id !== reactionId)));
      showAlert(
        wasSelected ? 'No se pudo quitar el calificador' : 'No se pudo marcar el calificador',
        errorMessage(err)
      );
    }
  }

  function openCreate() {
    setDraftEmoji('');
    setDraftName('');
    setDialog('create');
  }

  async function handleCreate() {
    if (!canCreate || !userId) return;
    setSaving(true);
    const { data, error } = await createReaction(userId, trimmedEmoji, trimmedName);
    setSaving(false);
    if (error) {
      showAlert('No se pudo crear el calificador', error.message);
      return;
    }
    setReactions((current) => [...current, data]);
    setDialog('pick');
    // Lo normal al crear uno es querer usarlo en esta película.
    handleToggle(data.id);
  }

  const selectedReactions = reactions.filter((reaction) => selectedIds.includes(reaction.id));
  const hiddenCount = selectedReactions.length - PREVIEW_COUNT;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selectedReactions.length > 0
            ? `Calificadores: ${selectedReactions.map((reaction) => reaction.name).join(', ')}`
            : 'Agregar calificadores'
        }
        disabled={!loaded}
        onPress={() => setDialog('pick')}
        style={[styles.button, selectedReactions.length > 0 && styles.buttonActive]}>
        {selectedReactions.length > 0 ? (
          <Text style={styles.buttonEmoji}>
            {selectedReactions
              .slice(0, PREVIEW_COUNT)
              .map((reaction) => reaction.emoji)
              .join(' ')}
            {hiddenCount > 0 && <Text style={styles.buttonMore}> +{hiddenCount}</Text>}
          </Text>
        ) : (
          <Text style={styles.buttonEmoji}>
            🙂<Text style={styles.buttonMore}> +</Text>
          </Text>
        )}
      </Pressable>

      <Modal
        transparent
        statusBarTranslucent
        animationType="fade"
        visible={dialog !== 'none'}
        onRequestClose={() => {
          if (!saving) setDialog('none');
        }}>
        <Pressable
          accessibilityLabel="Cerrar"
          disabled={saving}
          onPress={() => setDialog('none')}
          style={styles.backdrop}
        />

        {dialog === 'pick' && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>Calificadores</Text>
            <Text style={styles.dialogCopy}>Solo tú ves los calificadores que marcas.</Text>
            <View style={styles.wrap}>
              {reactions.map((reaction) => {
                const active = selectedIds.includes(reaction.id);
                return (
                  <Pressable
                    key={reaction.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={reaction.name}
                    onPress={() => handleToggle(reaction.id)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {reaction.emoji} {reaction.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" onPress={openCreate} style={[styles.chip, styles.chipCreate]}>
                <Text style={styles.chipCreateText}>+ Crear uno nuevo</Text>
              </Pressable>
            </View>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" onPress={() => setDialog('none')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Listo</Text>
              </Pressable>
            </View>
          </View>
        )}

        {dialog === 'create' && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>Nuevo calificador</Text>
            <View style={styles.createRow}>
              <TextInput
                value={draftEmoji}
                onChangeText={setDraftEmoji}
                maxLength={REACTION_EMOJI_MAX}
                autoFocus
                placeholder="🎬"
                placeholderTextColor="#7D7382"
                accessibilityLabel="Emoji del calificador"
                style={[styles.dialogInput, styles.emojiInput]}
              />
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                maxLength={REACTION_NAME_MAX}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                placeholder="Nombre"
                placeholderTextColor="#7D7382"
                accessibilityLabel="Nombre del calificador"
                style={[styles.dialogInput, styles.nameInput]}
              />
            </View>
            <Text style={styles.counter}>
              {draftName.length} / {REACTION_NAME_MAX}
            </Text>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDialog('pick')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canCreate }}
                disabled={!canCreate}
                onPress={handleCreate}
                style={[styles.dialogButton, styles.dialogButtonPrimary, !canCreate && styles.dialogButtonDisabled]}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonPrimaryText]}>
                  {saving ? 'Creando…' : 'Crear'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 56, height: 56, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#15131A', borderWidth: 1, borderColor: '#27222D', alignItems: 'center', justifyContent: 'center' },
  buttonActive: { borderColor: '#B94DFF', backgroundColor: '#1F1A26' },
  buttonEmoji: { fontSize: 20, color: '#F4F4F5' },
  buttonMore: { fontSize: 13, color: '#A1A1AA', fontWeight: '800' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { position: 'absolute', left: 24, right: 24, padding: 18, borderRadius: 18, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  dialogTitle: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  dialogCopy: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, marginTop: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431' },
  chipActive: { backgroundColor: '#403B47', borderColor: '#B94DFF' },
  chipText: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#F4F4F5', fontWeight: '800' },
  chipCreate: { borderStyle: 'dashed', borderColor: '#5B4A66' },
  chipCreateText: { color: '#D78CFF', fontSize: 13, fontWeight: '700' },
  createRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  dialogInput: { height: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', color: '#F4F4F5', fontSize: 14 },
  emojiInput: { width: 64, textAlign: 'center', fontSize: 20 },
  nameInput: { flex: 1 },
  counter: { color: '#7D7382', fontSize: 11, textAlign: 'right', marginTop: 6 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  dialogButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  dialogButtonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  dialogButtonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  dialogButtonPrimaryText: { color: '#FFFFFF' },
  dialogButtonDisabled: { opacity: 0.45 },
});
