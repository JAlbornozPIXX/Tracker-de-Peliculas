import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { PlayfairDisplay_900Black_Italic } from '@expo-google-fonts/playfair-display';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { useFonts } from 'expo-font';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { G, Polygon } from 'react-native-svg';

import { tornPaperPoints } from '@/modules/auth/utils/torn-paper';

// Colores de recortes de revista viejos, como en un afiche de cine de collage.
const PAPER = {
  cream: '#EFE2C4',
  white: '#F6F0E2',
  burgundy: '#8C2F39',
  mustard: '#C89B3C',
  teal: '#5D7F7A',
  slate: '#2F3A4A',
  rose: '#D8A7A0',
  brown: '#6E4B3A',
  ink: '#2A2523',
  gold: '#E8C46A',
} as const;

const FONTS = {
  fat: 'AbrilFatface_400Regular',
  slab: 'AlfaSlabOne_400Regular',
  condensed: 'BebasNeue_400Regular',
  italic: 'PlayfairDisplay_900Black_Italic',
  typewriter: 'SpecialElite_400Regular',
} as const;

type Cutout = {
  char: string;
  font: keyof typeof FONTS;
  paper: string;
  ink: string;
  // Papel de otro color asomando detrás, como un recorte pegado sobre otro.
  back?: string;
  rotate: number;
  width: number;
  height: number;
  size: number;
  lift?: number;
  seed: number;
};

const ROWS: Cutout[][] = [
  [
    { char: 'C', font: 'fat', paper: PAPER.cream, ink: PAPER.burgundy, rotate: -7, width: 72, height: 84, size: 64, seed: 11 },
    { char: 'I', font: 'condensed', paper: PAPER.slate, ink: PAPER.cream, back: PAPER.rose, rotate: 5, width: 50, height: 88, size: 72, lift: -6, seed: 23 },
    { char: 'N', font: 'slab', paper: PAPER.rose, ink: PAPER.ink, rotate: -3, width: 74, height: 78, size: 54, lift: 4, seed: 37 },
    { char: 'E', font: 'italic', paper: PAPER.mustard, ink: PAPER.ink, back: PAPER.brown, rotate: 6, width: 66, height: 86, size: 64, lift: -2, seed: 41 },
  ],
  [
    { char: 'T', font: 'typewriter', paper: PAPER.teal, ink: PAPER.cream, rotate: -5, width: 64, height: 80, size: 66, seed: 53 },
    { char: 'E', font: 'slab', paper: PAPER.burgundy, ink: PAPER.cream, back: PAPER.cream, rotate: 4, width: 66, height: 80, size: 52, lift: 6, seed: 67 },
    { char: 'C', font: 'condensed', paper: PAPER.white, ink: PAPER.slate, back: PAPER.teal, rotate: -4, width: 56, height: 86, size: 74, lift: -4, seed: 71 },
    { char: 'A', font: 'fat', paper: PAPER.brown, ink: PAPER.gold, rotate: 8, width: 72, height: 86, size: 62, lift: 2, seed: 89 },
  ],
];

// La sombra del recorte se corre estos píxeles hacia abajo y la derecha.
const SHADOW = 3;
// Borde del papel de atrás que queda a la vista.
const BACK_MARGIN = 5;

function CutoutLetter({ cutout, index, fontsReady }: { cutout: Cutout; index: number; fontsReady: boolean }) {
  const { width, height, back, seed } = cutout;
  const paperWidth = width - SHADOW;
  const paperHeight = height - SHADOW;
  const outline = tornPaperPoints(paperWidth, paperHeight, seed, { roughness: 4 });
  const front = back
    ? tornPaperPoints(paperWidth - BACK_MARGIN * 2, paperHeight - BACK_MARGIN * 2, seed + 1, {
        roughness: 3,
        offsetX: BACK_MARGIN,
        offsetY: BACK_MARGIN,
      })
    : outline;

  return (
    <Animated.View entering={ZoomIn.delay(120 + index * 70).springify().damping(14)} style={styles.cutoutSlot}>
      <View style={{ width, height, transform: [{ translateY: cutout.lift ?? 0 }, { rotate: `${cutout.rotate}deg` }] }}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <G transform={`translate(${SHADOW} ${SHADOW})`}>
            <Polygon points={outline} fill="rgba(0,0,0,0.45)" />
          </G>
          {back && <Polygon points={outline} fill={back} />}
          <Polygon points={front} fill={cutout.paper} />
        </Svg>
        <View style={[styles.letterBox, { width: paperWidth, height: paperHeight }]}>
          <Text
            allowFontScaling={false}
            style={[
              styles.letter,
              { color: cutout.ink, fontSize: cutout.size, lineHeight: Math.round(cutout.size * 1.15) },
              fontsReady ? { fontFamily: FONTS[cutout.font] } : styles.letterFallback,
            ]}>
            {cutout.char}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * «CINETECA» armado con letras recortadas de distintas revistas, cada una
 * con su tipografía, papel y giro. Al ser accessible, los lectores de
 * pantalla oyen solo «CineTeca» y no letra por letra.
 */
export function CollageTitle({ tagline }: { tagline?: string }) {
  const [loaded, error] = useFonts({
    AbrilFatface_400Regular,
    AlfaSlabOne_400Regular,
    BebasNeue_400Regular,
    PlayfairDisplay_900Black_Italic,
    SpecialElite_400Regular,
  });
  // Si las fuentes no cargan, el collage se arma igual con la del sistema.
  const fontsReady = loaded && !error;

  return (
    <View accessible accessibilityRole="header" accessibilityLabel="CineTeca" style={styles.wrap}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, rowIndex === 1 && styles.secondRow]}>
          {row.map((cutout, i) => (
            <CutoutLetter key={i} cutout={cutout} index={rowIndex * row.length + i} fontsReady={fontsReady} />
          ))}
        </View>
      ))}
      {tagline && (
        <Animated.View entering={ZoomIn.delay(760)} style={styles.taglineWrap}>
          {/* El giro va en la vista de adentro: la animación de entrada usa transform. */}
          <View style={styles.tagline}>
            <Text allowFontScaling={false} style={[styles.taglineText, fontsReady && { fontFamily: FONTS.typewriter }]}>
              {tagline}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  secondRow: { marginTop: -6, marginLeft: 28 },
  cutoutSlot: { marginHorizontal: -2 },
  letterBox: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  letter: { textAlign: 'center', includeFontPadding: false },
  letterFallback: { fontWeight: '900' },
  taglineWrap: { marginTop: 14 },
  tagline: {
    transform: [{ rotate: '-2deg' }],
    backgroundColor: PAPER.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
  },
  taglineText: { color: PAPER.ink, fontSize: 15, letterSpacing: 0.5 },
});
