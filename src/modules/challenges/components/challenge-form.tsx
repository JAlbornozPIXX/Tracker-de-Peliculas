import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipOption, Chips } from '@/components/chips';
import { createChallenge } from '@/modules/challenges/api/challenges';
import {
  addDays,
  Challenge,
  CHALLENGE_TITLE_MAX,
  ChallengeFilter,
  monthRange,
  validateChallenge,
  yearRange,
} from '@/modules/challenges/utils/challenges';
import type { ListSummary } from '@/modules/lists/api/lists';
import { DateField } from '@/modules/movies/components/date-field';
import { toLocalDateString } from '@/modules/movies/utils/view-date';

// El selector de fecha exige un máximo; un reto puede terminar en el futuro.
const MAX_DATE = '2099-12-31';

export type ChallengeFormValues = {
  title: string;
  target: string;
  startsOn: string;
  endsOn: string;
  filter: ChallengeFilter;
};

export function emptyChallengeForm(): ChallengeFormValues {
  return { title: '', target: '', ...monthRange(toLocalDateString(new Date())), filter: {} };
}

type FilterMode = 'all' | 'genre' | 'list';
type Preset = 'month' | 'next30' | 'year' | null;

const FILTER_MODES: ChipOption<FilterMode>[] = [
  { key: 'all', label: 'Todas' },
  { key: 'genre', label: 'Un género' },
  { key: 'list', label: 'Una lista' },
];

const PRESETS: ChipOption<Preset>[] = [
  { key: 'month', label: 'Este mes' },
  { key: 'next30', label: 'Próximos 30 días' },
  { key: 'year', label: 'Este año' },
  { key: null, label: 'Otras fechas' },
];

function presetRange(preset: Exclude<Preset, null>, today: string) {
  if (preset === 'month') return monthRange(today);
  if (preset === 'year') return yearRange(today);
  return { startsOn: today, endsOn: addDays(today, 29) };
}

/**
 * Hoja para crear un reto: nombre, meta de vistas, plazo y filtro opcional
 * por género o lista. initial permite "Crear otro" a partir de uno vencido.
 * Se monta solo mientras está abierta, así cada apertura parte de initial.
 */
export function ChallengeForm({
  userId,
  initial,
  genres,
  lists,
  onClose,
  onCreated,
}: {
  userId: string;
  initial: ChallengeFormValues;
  genres: string[];
  lists: ListSummary[];
  onClose: () => void;
  onCreated: (challenge: Challenge) => void;
}) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(initial);
  const [preset, setPreset] = useState<Preset>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>(
    initial.filter.genre != null ? 'genre' : initial.filter.list_id != null ? 'list' : 'all'
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(change: Partial<ChallengeFormValues>) {
    setValues((current) => ({ ...current, ...change }));
    setError(null);
  }

  function choosePreset(next: Preset) {
    setPreset(next);
    if (next) update(presetRange(next, toLocalDateString(new Date())));
  }

  function chooseFilterMode(next: FilterMode) {
    setFilterMode(next);
    update({ filter: {} });
  }

  async function handleCreate() {
    const message =
      validateChallenge(values) ??
      (filterMode === 'genre' && values.filter.genre == null ? 'Elige un género o cuenta todas las películas.' : null) ??
      (filterMode === 'list' && values.filter.list_id == null ? 'Elige una lista o cuenta todas las películas.' : null);
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    try {
      const challenge = await createChallenge(userId, {
        title: values.title.trim(),
        targetCount: Number(values.target.trim()),
        filter: values.filter,
        startsOn: values.startsOn,
        endsOn: values.endsOn,
      });
      onCreated(challenge);
    } catch (err) {
      setError(err instanceof Error ? `No se pudo crear el reto: ${err.message}` : 'No se pudo crear el reto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="slide"
      visible
      onRequestClose={() => !saving && onClose()}>
      <Pressable accessibilityLabel="Cerrar" disabled={saving} onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.sheetTitle}>Nuevo reto</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={values.title}
            onChangeText={(title) => update({ title })}
            maxLength={CHALLENGE_TITLE_MAX}
            placeholder="Ej.: 5 películas en octubre"
            placeholderTextColor="#7D7382"
            accessibilityLabel="Nombre del reto"
            style={styles.input}
          />

          <Text style={styles.label}>Meta (películas vistas)</Text>
          <TextInput
            value={values.target}
            onChangeText={(target) => update({ target })}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="5"
            placeholderTextColor="#7D7382"
            accessibilityLabel="Meta de películas vistas"
            style={[styles.input, styles.targetInput]}
          />

          <Text style={styles.label}>Plazo</Text>
          <Chips options={PRESETS} value={preset} onChange={choosePreset} scroll />
          <View style={styles.dates}>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>Inicio</Text>
              <DateField
                label="Inicio del reto"
                value={values.startsOn}
                max={MAX_DATE}
                onChange={(startsOn) => {
                  setPreset(null);
                  update({ startsOn });
                }}
              />
            </View>
            <View style={styles.dateColumn}>
              <Text style={styles.dateLabel}>Término</Text>
              <DateField
                label="Término del reto"
                value={values.endsOn}
                max={MAX_DATE}
                onChange={(endsOn) => {
                  setPreset(null);
                  update({ endsOn });
                }}
              />
            </View>
          </View>

          <Text style={styles.label}>Qué películas cuentan</Text>
          <Chips options={FILTER_MODES} value={filterMode} onChange={chooseFilterMode} />
          {filterMode === 'genre' && (
            <View style={styles.subChips}>
              {genres.length > 0 ? (
                <Chips
                  options={genres.map((genre) => ({ key: genre, label: genre }))}
                  value={values.filter.genre ?? null}
                  onChange={(genre) => update({ filter: genre ? { genre } : {} })}
                  scroll
                />
              ) : (
                <Text style={styles.hint}>Todavía no hay géneros en tu catálogo.</Text>
              )}
            </View>
          )}
          {filterMode === 'list' && (
            <View style={styles.subChips}>
              {lists.length > 0 ? (
                <Chips
                  options={lists.map((list) => ({ key: list.id, label: list.name }))}
                  value={values.filter.list_id ?? null}
                  onChange={(listId) => update({ filter: listId != null ? { list_id: listId } : {} })}
                  scroll
                />
              ) : (
                <Text style={styles.hint}>Todavía no tienes listas.</Text>
              )}
            </View>
          )}

          {error && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={handleCreate}
            style={[styles.button, styles.buttonPrimary, saving && styles.buttonDisabled]}>
            <Text style={[styles.buttonText, styles.buttonPrimaryText]}>{saving ? 'Creando…' : 'Crear reto'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', paddingTop: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#1C1822', borderWidth: 1, borderColor: '#292431' },
  sheetTitle: { color: '#F4F4F5', fontSize: 18, fontWeight: '800', paddingHorizontal: 18 },
  content: { paddingHorizontal: 18, paddingBottom: 8 },
  label: { color: '#D5D0D8', fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  input: { height: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', color: '#F4F4F5', fontSize: 14 },
  targetInput: { width: 110 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  dateColumn: { gap: 6 },
  dateLabel: { color: '#8F8795', fontSize: 12, fontWeight: '600' },
  subChips: { marginTop: 10 },
  hint: { color: '#8F8795', fontSize: 13 },
  error: { color: '#F87171', fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 18, paddingTop: 14 },
  button: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#292431' },
  buttonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  buttonPrimary: { backgroundColor: '#A83BDD', borderColor: '#A83BDD' },
  buttonPrimaryText: { color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.45 },
});
