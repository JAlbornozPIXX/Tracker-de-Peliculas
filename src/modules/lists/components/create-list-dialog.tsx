import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chips } from '@/components/chips';
import { createList, LIST_NAME_MAX } from '@/modules/lists/api/lists';
import { LIST_KINDS, ListKind } from '@/modules/lists/constants/kinds';
import { showAlert } from '@/utils/alert';

/**
 * Diálogo para crear una lista pidiendo nombre y tipo. Se abre con el tipo de
 * la pestaña en la que está el usuario. Se monta solo mientras está abierto,
 * así cada apertura empieza vacía.
 */
export function CreateListDialog({
  userId,
  initialKind,
  onClose,
  onCreated,
}: {
  userId: string;
  initialKind: ListKind;
  onClose: () => void;
  onCreated: (list: { id: number; name: string; kind: ListKind }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ListKind>(initialKind);
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0 && !saving;

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    const { data, error } = await createList(userId, trimmedName, kind);
    setSaving(false);
    if (error) {
      showAlert('No se pudo crear la lista', error.message);
      return;
    }
    onCreated(data);
  }

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="fade"
      visible
      onRequestClose={() => {
        if (!saving) onClose();
      }}>
      <Pressable accessibilityLabel="Cerrar" disabled={saving} onPress={onClose} style={styles.backdrop} />
      <View style={[styles.dialog, { top: insets.top + 90 }]}>
        <Text style={styles.title}>Nueva lista</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={LIST_NAME_MAX}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          placeholder="Nombre de la lista"
          placeholderTextColor="#7D7382"
          accessibilityLabel="Nombre de la lista"
          style={styles.input}
        />
        <Text style={styles.label}>Tipo</Text>
        <Chips options={LIST_KINDS} value={kind} onChange={setKind} />
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCreate }}
            disabled={!canCreate}
            onPress={handleCreate}
            style={[styles.button, styles.buttonPrimary, !canCreate && styles.buttonDisabled]}>
            <Text style={[styles.buttonText, styles.buttonPrimaryText]}>{saving ? 'Creando…' : 'Crear'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { position: 'absolute', left: 24, right: 24, padding: 18, borderRadius: 18, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  title: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  label: { color: '#D5D0D8', fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  input: { height: 46, marginTop: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', color: '#F4F4F5', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  buttonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  buttonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  buttonPrimaryText: { color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.45 },
});
