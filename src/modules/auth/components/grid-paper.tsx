import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

const CELL = 22;

/**
 * Papel cuadriculado tenue detrás del login, como la hoja donde se pegan los
 * recortes. Decorativo: no es tocable ni lo leen los lectores de pantalla.
 */
export function GridPaper() {
  // En web el SVG no toma "100%": se dibuja del tamaño de la ventana.
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
            <Path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.05} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
      </Svg>
    </View>
  );
}
