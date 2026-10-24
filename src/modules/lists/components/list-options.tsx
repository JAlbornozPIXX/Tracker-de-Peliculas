import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chips } from '@/components/chips';
import { changeListKind, deleteList, LIST_NAME_MAX, renameList } from '@/modules/lists/api/lists';
import { LIST_KINDS, ListKind } from '@/modules/lists/constants/kinds';

/**
 * Botón de tres puntos con las opciones de una lista: cambiar nombre, cambiar
 * tipo y eliminar. Alert con botones no funciona en web, así que el menú y las
 * confirmaciones se muestran en un Modal propio.
 */
export function ListOptions({
  list,
  compact = false,
  onRenamed,
  onKindChanged,
  onDeleted,
}: {
  list: { id: number; name: string; kind: ListKind };
  compact?: boolean;
  onRenamed: (name: string) => void;
  onKindChanged: (kind: ListKind) => void;
  onDeleted: () => void;
}) {
  const insets = useSafeAreaInsets();
  const buttonRef = useRef<View>(null);

  const [dialog, setDialog] = useState<'none' | 'menu' | 'rename' | 'kind' | 'delete'>('none');
  const [menuTop, setMenuTop] = useState(0);
  const [draftName, setDraftName] = useState('');
  const [draftKind, setDraftKind] = useState<ListKind>(list.kind);
  const [saving, setSaving] = useState(false);

  const trimmedDraftName = draftName.trim();
  const canRename = trimmedDraftName.length > 0 && !saving;

  function openMenu() {
    // El menú se abre justo debajo del botón que lo disparó.
    buttonRef.current?.measureInWindow((_x, y, _width, height) => {
      setMenuTop(y + height + 6);
      setDialog('menu');
    });
  }

  function openRename() {
    setDraftName(list.name);
    setDialog('rename');
  }

  async function handleRename() {
    if (!canRename) return;
    setSaving(true);
    const { error } = await renameList(list.id, trimmedDraftName);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo cambiar el nombre', error.message);
      return;
    }
    setDialog('none');
    onRenamed(trimmedDraftName);
  }

  function openKind() {
    setDraftKind(list.kind);
    setDialog('kind');
  }

  async function handleKindChange() {
    if (draftKind === list.kind) {
      setDialog('none');
      return;
    }
    setSaving(true);
    const { error } = await changeListKind(list.id, draftKind);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo cambiar el tipo', error.message);
      return;
    }
    setDialog('none');
    onKindChanged(draftKind);
  }

  async function handleDelete() {
    setSaving(true);
    const { error } = await deleteList(list.id);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo eliminar la lista', error.message);
      return;
    }
    setDialog('none');
    onDeleted();
  }

  return (
    <>
      <Pressable
        ref={buttonRef}
        accessibilityRole="button"
        accessibilityLabel={`Opciones de la lista ${list.name}`}
        hitSlop={8}
        onPress={openMenu}
        style={[styles.button, compact && styles.buttonCompact]}>
        <Text style={styles.buttonIcon}>⋮</Text>
      </Pressable>

      <Modal
        transparent
        statusBarTranslucent
        animationType="fade"
        visible={dialog !== 'none'}
        onRequestClose={() => !saving && setDialog('none')}>
        <Pressable
          accessibilityLabel="Cerrar"
          disabled={saving}
          onPress={() => setDialog('none')}
          style={styles.backdrop}
        />

        {dialog === 'menu' && (
          <View style={[styles.menu, { top: menuTop }]}>
            <Pressable accessibilityRole="button" onPress={openRename} style={styles.menuItem}>
              <Text style={styles.menuItemText}>Cambiar nombre</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable accessibilityRole="button" onPress={openKind} style={styles.menuItem}>
              <Text style={styles.menuItemText}>Cambiar tipo</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable accessibilityRole="button" onPress={() => setDialog('delete')} style={styles.menuItem}>
              <Text style={[styles.menuItemText, styles.dangerText]}>Eliminar lista</Text>
            </Pressable>
          </View>
        )}

        {dialog === 'rename' && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>Cambiar nombre</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              maxLength={LIST_NAME_MAX}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleRename}
              placeholder="Nombre de la lista"
              placeholderTextColor="#7D7382"
              accessibilityLabel="Nombre de la lista"
              style={styles.dialogInput}
            />
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDialog('none')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canRename }}
                disabled={!canRename}
                onPress={handleRename}
                style={[styles.dialogButton, styles.dialogButtonPrimary, !canRename && styles.dialogButtonDisabled]}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonPrimaryText]}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {dialog === 'kind' && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>Tipo de lista</Text>
            <Text style={styles.dialogCopy}>Playlists y colecciones muestran su avance y se pueden ordenar a mano.</Text>
            <View style={styles.dialogChips}>
              <Chips options={LIST_KINDS} value={draftKind} onChange={setDraftKind} />
            </View>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDialog('none')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleKindChange}
                style={[styles.dialogButton, styles.dialogButtonPrimary]}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonPrimaryText]}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {dialog === 'delete' && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>¿Eliminar “{list.name}”?</Text>
            <Text style={styles.dialogCopy}>
              La lista se borrará para siempre. Las películas no se eliminan de tu cuenta ni de tus otras listas.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDialog('none')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleDelete}
                style={[styles.dialogButton, styles.dialogButtonDanger]}>
                <Text style={[styles.dialogButtonText, styles.dangerText]}>{saving ? 'Eliminando…' : 'Eliminar'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  buttonCompact: { width: 30, height: 30, borderRadius: 15 },
  buttonIcon: { color: '#F4F4F5', fontSize: 20, lineHeight: 22, fontWeight: '800' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  menu: { position: 'absolute', right: 16, minWidth: 190, borderRadius: 14, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431', overflow: 'hidden' },
  menuItem: { paddingVertical: 14, paddingHorizontal: 16 },
  menuItemText: { color: '#F4F4F5', fontSize: 14, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#292431' },
  dangerText: { color: '#F87171' },
  dialog: { position: 'absolute', left: 24, right: 24, padding: 18, borderRadius: 18, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  dialogTitle: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  dialogCopy: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, marginTop: 8 },
  dialogChips: { marginTop: 14 },
  dialogInput: { height: 46, marginTop: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', color: '#F4F4F5', fontSize: 14 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  dialogButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  dialogButtonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  dialogButtonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  dialogButtonPrimaryText: { color: '#FFFFFF' },
  dialogButtonDisabled: { opacity: 0.45 },
  dialogButtonDanger: { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: '#F87171' },
});
