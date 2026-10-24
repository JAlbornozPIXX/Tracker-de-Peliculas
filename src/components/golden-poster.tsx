import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { isGoldenRating } from '@/utils/golden-rating';
import { posterInitial } from '@/utils/poster-initial';

const GOLD = '#E8B64C';
const FRAME_WIDTH = 3;

/**
 * Portada de un título en proporción 2:3; size es el ancho. Con nota 5 lleva
 * marco dorado y un destello breve al aparecer o al llegar a 5. Las medidas
 * exteriores no cambian con el marco, así que la tarjeta no salta.
 */
export function GoldenPoster({
  posterUrl,
  title,
  rating,
  size,
}: {
  posterUrl: string | null;
  title: string;
  rating: number | null;
  size: number;
}) {
  const golden = isGoldenRating(rating);
  const scale = useSharedValue(1);
  const glow = useSharedValue(golden ? 0.55 : 0);

  useEffect(() => {
    if (!golden) {
      glow.value = 0;
      return;
    }
    scale.value = withSequence(withTiming(1.05, { duration: 180 }), withSpring(1, { damping: 12 }));
    glow.value = withSequence(withTiming(1, { duration: 180 }), withTiming(0.55, { duration: 700 }));
  }, [golden, scale, glow]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value * 0.35 }));

  const radius = Math.round(size * 0.1);
  const height = Math.round(size * 1.5);

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={golden ? `Portada de ${title}, calificada con 5 estrellas` : `Portada de ${title}`}
      style={[{ width: size, height }, popStyle]}>
      {golden && <Animated.View style={[styles.glow, { borderRadius: radius + 6 }, glowStyle]} />}
      <View
        style={[
          styles.frame,
          { borderRadius: radius },
          golden && { borderWidth: FRAME_WIDTH, borderColor: GOLD },
        ]}>
        {posterUrl ? (
          <Image accessibilityIgnoresInvertColors source={{ uri: posterUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={[styles.mark, { fontSize: Math.round(size * 0.36) }]}>{posterInitial(title)}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -6, right: -6, bottom: -6, left: -6, backgroundColor: GOLD },
  frame: { flex: 1, overflow: 'hidden', backgroundColor: '#21172A', borderWidth: 1, borderColor: '#432653', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  mark: { color: '#9F43D4', fontWeight: '900', opacity: 0.7 },
});
