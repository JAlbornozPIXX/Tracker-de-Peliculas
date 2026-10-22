import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ViewEntry } from '@/modules/movies/api/views';
import { DateField } from '@/modules/movies/components/date-field';
import { formatViewCount, formatViewDate, toLocalDateString } from '@/modules/movies/utils/view-date';

/**
 * Resumen "Vista N veces · última: fecha", lista de vistas con borrado y
 * botón para registrar una nueva. Alert con botones no funciona en web, así
 * que el formulario y la confirmación se muestran en un Modal propio.
 */
export function ViewsSection({
  views,
  onAdd,
  onDelete,
}: {
  views: ViewEntry[];
  onAdd: (viewedOn: string) => Promise<void>;
  onDelete: (viewId: number) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();

  const [dialog, setDialog] = useState<'none' | 'add' | 'delete'>('none');
  const [draftDate, setDraftDate] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ViewEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Se recalcula al abrir: la ficha puede quedar abierta pasada la medianoche.
  const [today, setToday] = useState(() => toLocalDateString(new Date()));

  function openAdd() {
    const now = toLocalDateString(new Date());
    setToday(now);
    setDraftDate(now);
    setDialog('add');
  }

  function openDelete(view: ViewEntry) {
    setPendingDelete(view);
    setDialog('delete');
  }

  async function handleAdd() {
    if (saving || draftDate > today) return;
    setSaving(true);
    try {
      await onAdd(draftDate);
      setDialog('none');
    } catch (err) {
      Alert.alert('No se pudo registrar la vista', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving || !pendingDelete) return;
    setSaving(true);
    try {
      await onDelete(pendingDelete.id);
      setDialog('none');
    } catch (err) {
      Alert.alert('No se pudo borrar la vista', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Text style={styles.summary}>
        {views.length === 0
          ? 'Sin vistas registradas'
          : `${formatViewCount(views.length)} · última: ${formatViewDate(views[0].viewedOn)}`}
      </Text>

      {views.length > 0 && (
        <View style={styles.list}>
          {views.map((view) => (
            <View key={view.id} style={styles.row}>
              <Text style={styles.rowText}>
                {formatViewDate(view.viewedOn)}
                {view.source === 'auto' && <Text style={styles.rowTag}> · al terminar</Text>}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Borrar la vista del ${formatViewDate(view.viewedOn)}`}
                hitSlop={8}
                onPress={() => openDelete(view)}
                style={styles.deleteButton}>
                <Text style={styles.deleteIcon}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={openAdd} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Registrar nueva vista</Text>
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

        {dialog === 'add' && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>Registrar nueva vista</Text>
            <Text style={styles.dialogCopy}>¿Qué día la viste?</Text>
            <View style={styles.dateWrap}>
              <DateField value={draftDate} max={today} onChange={setDraftDate} />
            </View>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDialog('none')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleAdd}
                style={[styles.dialogButton, styles.dialogButtonPrimary, saving && styles.dialogButtonDisabled]}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonPrimaryText]}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {dialog === 'delete' && pendingDelete && (
          <View style={[styles.dialog, { top: insets.top + 110 }]}>
            <Text style={styles.dialogTitle}>¿Borrar esta vista?</Text>
            <Text style={styles.dialogCopy}>Se quitará la vista del {formatViewDate(pendingDelete.viewedOn)}.</Text>
            <View style={styles.dialogActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setDialog('none')} style={styles.dialogButton}>
                <Text style={styles.dialogButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleDelete}
                style={[styles.dialogButton, styles.dialogButtonDanger]}>
                <Text style={[styles.dialogButtonText, styles.dangerText]}>{saving ? 'Borrando…' : 'Borrar'}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { color: '#D5D0D8', fontSize: 14, fontWeight: '700' },
  list: { marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: '#27222D', backgroundColor: '#15131A', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#27222D' },
  rowText: { color: '#F4F4F5', fontSize: 13, fontWeight: '600' },
  rowTag: { color: '#8F8795', fontWeight: '500' },
  deleteButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { color: '#F87171', fontSize: 14, fontWeight: '800' },
  addButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#5B4A66' },
  addButtonText: { color: '#D78CFF', fontSize: 13, fontWeight: '700' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { position: 'absolute', left: 24, right: 24, padding: 18, borderRadius: 18, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  dialogTitle: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  dialogCopy: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, marginTop: 8 },
  dateWrap: { marginTop: 14 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  dialogButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  dialogButtonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  dialogButtonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  dialogButtonPrimaryText: { color: '#FFFFFF' },
  dialogButtonDisabled: { opacity: 0.45 },
  dialogButtonDanger: { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: '#F87171' },
  dangerText: { color: '#F87171' },
});
