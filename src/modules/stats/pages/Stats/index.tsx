import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chips, type ChipOption } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import { HomeBackButton } from '@/components/home-back-button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { formatViewDate } from '@/modules/movies/utils/view-date';
import { getLatestViewDate, getViewRecords } from '@/modules/stats/api/stats';
import { ActivityHeatmap } from '@/modules/stats/components/activity-heatmap';
import { ActivityLineChart } from '@/modules/stats/components/activity-line-chart';
import { formatMinutes, monthName } from '@/modules/stats/utils/format';
import type { ViewRecord } from '@/modules/stats/utils/metrics';
import {
  activitySeries,
  heatmapWeeks,
  isLatestSelection,
  selectionAt,
  selectionForDay,
  selectionLabel,
  selectionPeriod,
  shiftSelection,
  summarizePeriod,
  viewsByDay,
  type StatsMode,
  type StatsSelection,
} from '@/modules/stats/utils/series';
import { errorMessage } from '@/utils/alert';

const MODE_OPTIONS: ChipOption<StatsMode>[] = [
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Año' },
];

// Los datos guardan el período del que vienen: al cambiar de período no se
// muestran ni un instante con las etiquetas del nuevo.
type Loaded = { key: string; records: ViewRecord[]; latestDay: string | null };
type LoadError = { key: string; message: string };

function selectionKey(selection: StatsSelection) {
  return selection.mode === 'month' ? `${selection.year}-${selection.month}` : String(selection.year);
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function Totals({ records }: { records: ViewRecord[] }) {
  const summary = summarizePeriod(records);
  return (
    <View style={styles.totals}>
      <View style={[styles.totalCard, styles.totalCardWide]}>
        <Text style={styles.totalLabel}>Tiempo invertido</Text>
        <Text style={styles.totalValue}>{formatMinutes(summary.minutes)}</Text>
      </View>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Vistas</Text>
        <Text style={styles.totalValue}>{summary.views}</Text>
      </View>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Títulos</Text>
        <Text style={styles.totalValue}>{summary.titles}</Text>
      </View>
    </View>
  );
}

function Charts({ selection, records }: { selection: StatsSelection; records: ViewRecord[] }) {
  const label = selectionLabel(selection);
  const points = activitySeries(selection, records);
  const busiest = points.reduce((best, point, index) => (point.views > points[best].views ? index : best), 0);
  const peak = selection.mode === 'month' ? `el día ${busiest + 1}` : `en ${monthName(busiest + 1).toLowerCase()}`;
  const byDay = viewsByDay(records);
  const unit = selection.mode === 'month' ? 'día' : 'mes';

  return (
    <>
      <Text style={styles.sectionTitle}>Actividad por {unit}</Text>
      <View style={styles.card}>
        <ActivityLineChart
          points={points}
          accessibilityLabel={`Vistas por ${unit} en ${label}: ${plural(records.length, 'vista', 'vistas')} en total, la mayor cantidad ${peak} (${points[busiest].views}).`}
        />
      </View>

      <Text style={styles.sectionTitle}>Mapa de actividad</Text>
      <View style={styles.card}>
        <ActivityHeatmap
          mode={selection.mode}
          weeks={heatmapWeeks(selectionPeriod(selection), byDay)}
          accessibilityLabel={`Mapa de calor de ${label}: ${plural(byDay.size, 'día', 'días')} con vistas.`}
        />
      </View>
    </>
  );
}

export default function Stats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [selection, setSelection] = useState<StatsSelection>(() => selectionAt(new Date(), 'month'));
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const key = selectionKey(selection);

  // Se recarga al volver a la pantalla: puede haber vistas nuevas desde una ficha.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      Promise.all([getViewRecords(userId, selectionPeriod(selection)), getLatestViewDate(userId)])
        .then(([records, latestDay]) => {
          if (!active) return;
          setLoaded({ key, records, latestDay });
          setLoadError(null);
        })
        .catch((err) => active && setLoadError({ key, message: errorMessage(err) || 'Inténtalo de nuevo.' }));
      return () => {
        active = false;
      };
    }, [userId, selection, key])
  );

  const data = loaded?.key === key ? loaded : null;
  const error = loadError?.key === key ? loadError.message : null;
  const isLatest = isLatestSelection(selection, new Date());

  function changeMode(mode: StatsMode) {
    setSelection((current) => ({ ...current, mode }));
  }

  // Una copia del mismo período vuelve a ejecutar la carga.
  function retry() {
    setLoadError(null);
    setSelection((current) => ({ ...current }));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <HomeBackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>Estadísticas</Text>
          <Text style={styles.subtitle}>Tu tiempo frente a la pantalla</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        <Chips options={MODE_OPTIONS} value={selection.mode} onChange={changeMode} />

        <View style={styles.periodRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selection.mode === 'month' ? 'Mes anterior' : 'Año anterior'}
            hitSlop={8}
            onPress={() => setSelection((current) => shiftSelection(current, -1))}
            style={styles.periodButton}>
            <Text style={styles.periodArrow}>‹</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.periodLabel}>
            {selectionLabel(selection)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selection.mode === 'month' ? 'Mes siguiente' : 'Año siguiente'}
            accessibilityState={{ disabled: isLatest }}
            disabled={isLatest}
            hitSlop={8}
            onPress={() => setSelection((current) => shiftSelection(current, 1))}
            style={[styles.periodButton, isLatest && styles.periodButtonDisabled]}>
            <Text style={styles.periodArrow}>›</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>No se pudieron cargar tus estadísticas</Text>
            <Text style={styles.panelCopy}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={retry} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : !data ? (
          <ActivityIndicator color="#B94DFF" size="large" style={styles.loading} />
        ) : data.records.length === 0 ? (
          data.latestDay ? (
            <EmptyNotice
              title="Sin actividad en ese período"
              copy={`Tu última vista fue el ${formatViewDate(data.latestDay)}.`}
              actionLabel="Cambiar período"
              onAction={() => setSelection(selectionForDay(data.latestDay!, selection.mode))}
            />
          ) : (
            <EmptyNotice
              title="Sin actividad en ese período"
              copy="Todavía no registras vistas: marca una película como Terminada o registra una vista en su ficha."
              actionLabel="Buscar películas"
              onAction={() => router.push('/search')}
            />
          )
        ) : (
          <>
            <Totals records={data.records} />
            <Charts selection={selection} records={data.records} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerText: { flex: 1 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  subtitle: { color: '#7D7382', fontSize: 12, marginTop: 2 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4 },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 16 },
  periodButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  periodButtonDisabled: { opacity: 0.35 },
  periodArrow: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  periodLabel: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  loading: { marginTop: 80 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  totalCard: { flexGrow: 1, flexBasis: '40%', backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 14 },
  totalCardWide: { flexBasis: '100%' },
  totalLabel: { color: '#8F8795', fontSize: 12, fontWeight: '700' },
  totalValue: { color: '#F4F4F5', fontSize: 22, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#F4F4F5', fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 14 },
  panel: { backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18 },
  panelTitle: { color: '#F4F4F5', fontSize: 16, fontWeight: '800' },
  panelCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19, marginTop: 6 },
  primaryButton: { alignSelf: 'flex-start', marginTop: 16, minWidth: 140, alignItems: 'center', backgroundColor: '#A83BDD', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
