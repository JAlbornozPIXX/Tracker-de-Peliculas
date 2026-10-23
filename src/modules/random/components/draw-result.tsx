import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyNotice } from '@/components/empty-notice';
import { GoldenPoster } from '@/components/golden-poster';
import type { MovieRow } from '@/modules/movies/api/movies';
import type { useDraw } from '@/modules/random/hooks/use-draw';

const POSTER_SIZE = 180;

export function SecondaryButton({ label, onPress, grow = false }: { label: string; onPress: () => void; grow?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.secondaryButton, grow && styles.grow]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function Suggestion({
  movie,
  againLabel,
  changeLabel,
  onAgain,
  onChange,
}: {
  movie: MovieRow;
  againLabel: string;
  changeLabel: string;
  onAgain: () => void;
  onChange: () => void;
}) {
  const router = useRouter();
  const meta = [
    movie.release_date?.slice(0, 4),
    movie.duration_minutes != null && `${movie.duration_minutes} min`,
    ...movie.genre.slice(0, 2),
  ].filter(Boolean);

  return (
    <View accessibilityLiveRegion="polite" style={styles.suggestion}>
      <Text style={styles.kicker}>TU PELÍCULA DE HOY</Text>
      <GoldenPoster posterUrl={movie.poster_url} title={movie.title} rating={null} size={POSTER_SIZE} />
      <Text style={styles.movieTitle}>{movie.title}</Text>
      {meta.length > 0 && <Text style={styles.movieMeta}>{meta.join(' · ')}</Text>}
      {movie.overview && (
        <Text numberOfLines={4} style={styles.overview}>
          {movie.overview}
        </Text>
      )}
      <PrimaryButton
        label="Ver ficha"
        onPress={() => router.push({ pathname: '/movie/[id]', params: { id: String(movie.id) } })}
      />
      <View style={styles.actionsRow}>
        <SecondaryButton label={againLabel} onPress={onAgain} grow />
        <SecondaryButton label={changeLabel} onPress={onChange} grow />
      </View>
    </View>
  );
}

/**
 * Resultado de un sorteo: cargando, la película sugerida o los avisos cuando
 * no hay candidatas o ya salieron todas. El aviso de vacío lo pone cada modo.
 */
export function DrawResult({
  draw,
  loadingText,
  againLabel,
  changeLabel,
  exhaustedCopy,
  empty,
  exhaustedActions,
}: {
  draw: ReturnType<typeof useDraw>;
  loadingText: string;
  againLabel: string;
  changeLabel: string;
  exhaustedCopy: string;
  empty: ReactNode;
  exhaustedActions?: ReactNode;
}) {
  switch (draw.phase) {
    case 'loading':
      return (
        <View style={styles.loading}>
          <ActivityIndicator color="#B94DFF" size="large" />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      );
    case 'suggestion':
      return (
        draw.current && (
          <Suggestion
            movie={draw.current}
            againLabel={againLabel}
            changeLabel={changeLabel}
            onAgain={draw.drawAgain}
            onChange={draw.backToSetup}
          />
        )
      );
    case 'empty':
      return (
        <View style={styles.notice}>
          {empty}
          <SecondaryButton label={changeLabel} onPress={draw.backToSetup} />
        </View>
      );
    case 'exhausted':
      return (
        <View style={styles.notice}>
          <EmptyNotice title="Ya salieron todas" copy={exhaustedCopy} actionLabel="Empezar de nuevo" onAction={draw.restart} />
          {exhaustedActions}
          <SecondaryButton label={changeLabel} onPress={draw.backToSetup} />
        </View>
      );
    default:
      return null;
  }
}

export const drawStyles = StyleSheet.create({
  intro: { color: '#A1A1AA', fontSize: 14, lineHeight: 20 },
  group: { marginTop: 22 },
  label: { color: '#D5D0D8', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  hint: { color: '#7D7382', fontSize: 12, marginTop: 8 },
  submit: { marginTop: 14 },
});

const styles = StyleSheet.create({
  primaryButton: { alignSelf: 'stretch', alignItems: 'center', marginTop: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: '#A83BDD' },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#292431', backgroundColor: '#17151D' },
  secondaryButtonText: { color: '#D5D0D8', fontSize: 13, fontWeight: '700' },
  grow: { flex: 1 },
  actionsRow: { flexDirection: 'row', alignSelf: 'stretch', gap: 10, marginTop: 10 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 80 },
  loadingText: { color: '#A1A1AA', fontSize: 14 },
  suggestion: { alignItems: 'center', paddingTop: 8 },
  kicker: { color: '#D78CFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 14 },
  movieTitle: { color: '#F4F4F5', fontSize: 22, lineHeight: 28, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  movieMeta: { color: '#81788A', fontSize: 13, marginTop: 6, textAlign: 'center' },
  overview: { color: '#A1A1AA', fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
  notice: { gap: 10 },
});
