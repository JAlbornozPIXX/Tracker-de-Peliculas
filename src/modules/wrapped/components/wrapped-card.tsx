import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldenPoster } from '@/components/golden-poster';
import { formatMinutes, formatRating, monthName } from '@/modules/stats/utils/format';
import type { RatedMovie } from '@/modules/stats/utils/metrics';
import type { WrappedSummary } from '@/modules/wrapped/utils/summary';

export const WRAPPED_CARD_WIDTH = 340;

function Total({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.total}>
      <Text style={styles.totalValue}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

function RatedPick({
  label,
  movie,
  posterSize,
  emptyCopy,
}: {
  label: string;
  movie: RatedMovie | null;
  posterSize: number;
  emptyCopy: string;
}) {
  return (
    <View style={styles.pick}>
      <Text style={styles.label}>{label}</Text>
      {movie ? (
        <>
          <GoldenPoster posterUrl={movie.posterUrl} title={movie.title} rating={movie.rating} size={posterSize} />
          <Text numberOfLines={2} style={styles.pickTitle}>
            {movie.title}
          </Text>
          <Text style={styles.pickRating}>★ {formatRating(movie.rating)}</Text>
        </>
      ) : (
        <Text style={styles.pickEmpty}>{emptyCopy}</Text>
      )}
    </View>
  );
}

//Tarjeta anual que se exporta como imagen: ancho fijo para que la imagen salga igual en cualquier pantalla
export function WrappedCard({ summary, ref }: { summary: WrappedSummary; ref?: Ref<View> }) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.kicker}>CINE-TECA · WRAPPED</Text>
      <Text style={styles.year}>{summary.year}</Text>
      <Text style={styles.subtitle}>Tu año en cine</Text>

      <View style={styles.totals}>
        <Total value={String(summary.views)} label={summary.views === 1 ? 'vista' : 'vistas'} />
        <Total value={String(summary.titles)} label={summary.titles === 1 ? 'título' : 'títulos'} />
        <Total value={formatMinutes(summary.minutes)} label="frente a la pantalla" />
      </View>

      {summary.busiestMonth && (
        <View style={styles.month}>
          <Text style={styles.label}>Mes de mayor consumo</Text>
          <Text style={styles.monthName}>{monthName(summary.busiestMonth.month)}</Text>
          <Text style={styles.monthViews}>
            {summary.busiestMonth.views === 1 ? '1 vista' : `${summary.busiestMonth.views} vistas`}
          </Text>
        </View>
      )}

      <View style={styles.picks}>
        <RatedPick label="Mejor puntuada" movie={summary.top} posterSize={120} emptyCopy="Puntúa tus películas para ver tu favorita." />
        <RatedPick label="Peor puntuada" movie={summary.bottom} posterSize={84} emptyCopy="Puntúa otra película para compararla." />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: WRAPPED_CARD_WIDTH, overflow: 'hidden', borderRadius: 26, padding: 22, backgroundColor: '#24102D', borderWidth: 1, borderColor: '#4D1E61' },
  glow: { position: 'absolute', right: -90, top: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: '#8B2FC1', opacity: 0.35 },
  kicker: { color: '#D78CFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  year: { color: '#FFFFFF', fontSize: 56, lineHeight: 62, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#D2C4D8', fontSize: 15, marginTop: 2 },
  totals: { flexDirection: 'row', gap: 8, marginTop: 22 },
  total: { flex: 1, backgroundColor: '#1A0D21', borderRadius: 14, borderWidth: 1, borderColor: '#3A1A49', paddingVertical: 12, paddingHorizontal: 10 },
  totalValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  totalLabel: { color: '#A991B3', fontSize: 11, marginTop: 3 },
  month: { marginTop: 18 },
  label: { color: '#D78CFF', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  monthName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  monthViews: { color: '#D2C4D8', fontSize: 13, marginTop: 2 },
  picks: { flexDirection: 'row', gap: 16, marginTop: 20, alignItems: 'flex-start' },
  pick: { flex: 1 },
  pickTitle: { color: '#F4F4F5', fontSize: 14, lineHeight: 18, fontWeight: '700', marginTop: 9 },
  pickRating: { color: '#E8B64C', fontSize: 13, fontWeight: '800', marginTop: 4 },
  pickEmpty: { color: '#A991B3', fontSize: 13, lineHeight: 18 },
});
