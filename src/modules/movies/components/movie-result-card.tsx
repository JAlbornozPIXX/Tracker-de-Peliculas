import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MovieResult } from '@/modules/movies/api/tmdb';

export function MovieResultCard({ movie, onPress }: { movie: MovieResult; onPress?: () => void }) {
  const yearLabel = movie.year ?? 'Año desconocido';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${movie.title}, ${yearLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.posterWrapper}>
        {movie.posterUrl ? (
          <Image accessibilityIgnoresInvertColors source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderMark}>{movie.title.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text numberOfLines={2} style={styles.title}>
          {movie.title}
        </Text>
        <Text style={styles.year}>{yearLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 14,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#15131A',
    borderWidth: 1,
    borderColor: '#27222D',
  },
  cardPressed: {
    backgroundColor: '#1C1822',
  },
  posterWrapper: {
    width: 64,
    height: 96,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#21172A',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderMark: {
    color: '#9F43D4',
    fontSize: 26,
    fontWeight: '900',
    opacity: 0.7,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#F4F4F5',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  year: {
    color: '#81788A',
    fontSize: 12,
  },
});
