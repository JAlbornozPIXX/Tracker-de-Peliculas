import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GoldenPoster } from '@/components/golden-poster';
import type { ShameMovie } from '@/modules/watchlist/api/shame';
import { formatDays } from '@/modules/watchlist/utils/shame';

// Distancia (fracción del ancho) que hay que arrastrar para decidir.
const SWIPE_THRESHOLD = 0.3;
const POSTER_SIZE = 200;

/**
 * Tarjeta del repaso. Derecha mantiene (sale volando); izquierda abre las
 * opciones y la tarjeta vuelve al centro por si se cancela.
 */
export function SwipeCard({
  movie,
  onKeep,
  onLeft,
}: {
  movie: ShameMovie;
  onKeep: () => void;
  onLeft: () => void;
}) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const threshold = width * SWIPE_THRESHOLD;

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > threshold) {
        translateX.value = withTiming(width * 1.5, { duration: 220 });
        scheduleOnRN(onKeep);
      } else {
        translateX.value = withSpring(0);
        if (event.translationX < -threshold) scheduleOnRN(onLeft);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-width, width], [-12, 12])}deg` },
    ],
  }));
  const keepStyle = useAnimatedStyle(() => ({ opacity: interpolate(translateX.value, [0, threshold], [0, 1], 'clamp') }));
  const leftStyle = useAnimatedStyle(() => ({ opacity: interpolate(translateX.value, [-threshold, 0], [1, 0], 'clamp') }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <GoldenPoster posterUrl={movie.posterUrl} title={movie.title} rating={null} size={POSTER_SIZE} />
        <Text numberOfLines={2} style={styles.title}>
          {movie.title}
        </Text>
        {movie.releaseYear != null && <Text style={styles.meta}>{movie.releaseYear}</Text>}
        <Text style={styles.days}>{formatDays(movie.days)} en Ver más tarde</Text>

        <Animated.View pointerEvents="none" style={[styles.stamp, styles.keepStamp, keepStyle]}>
          <Text style={[styles.stampText, styles.keepText]}>MANTENER</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.leftStamp, leftStyle]}>
          <Text style={[styles.stampText, styles.leftText]}>QUITAR</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: '#15131A', borderWidth: 1, borderColor: '#27222D' },
  title: { color: '#F4F4F5', fontSize: 21, lineHeight: 27, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  meta: { color: '#81788A', fontSize: 13, marginTop: 4 },
  days: { color: '#E8B64C', fontSize: 15, fontWeight: '800', marginTop: 10 },
  stamp: { position: 'absolute', top: 24, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 3 },
  keepStamp: { left: 20, borderColor: '#4ADE80', transform: [{ rotate: '-12deg' }] },
  leftStamp: { right: 20, borderColor: '#F87171', transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  keepText: { color: '#4ADE80' },
  leftText: { color: '#F87171' },
});
