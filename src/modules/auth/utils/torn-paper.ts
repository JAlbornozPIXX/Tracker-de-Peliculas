// Contorno de un recorte de papel con bordes irregulares, para el título en
// collage del login. Con la misma semilla sale siempre la misma forma: el
// recorte no cambia entre renders ni entre aperturas de la app.

// Generador pseudoaleatorio pequeño y determinista (mulberry32).
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Options = {
  // Cuánto entra cada punto del borde hacia adentro, en píxeles.
  roughness?: number;
  // Distancia aproximada entre puntos del borde.
  step?: number;
  // Desplazamiento del recorte dentro del dibujo.
  offsetX?: number;
  offsetY?: number;
};

/**
 * Puntos "x,y x,y …" de un polígono que recorre el rectángulo width×height
 * en sentido horario con cada punto metido hacia adentro entre 0 y roughness.
 */
export function tornPaperPoints(width: number, height: number, seed: number, options: Options = {}): string {
  const { roughness = 3, step = 7, offsetX = 0, offsetY = 0 } = options;
  const random = seededRandom(seed);
  const jitter = () => random() * roughness;
  const points: [number, number][] = [];

  const along = (length: number) => Math.max(2, Math.round(length / step));
  const top = along(width);
  const side = along(height);

  for (let i = 0; i < top; i++) points.push([(width * i) / top, jitter()]);
  for (let i = 0; i < side; i++) points.push([width - jitter(), (height * i) / side]);
  for (let i = 0; i < top; i++) points.push([width - (width * i) / top, height - jitter()]);
  for (let i = 0; i < side; i++) points.push([jitter(), height - (height * i) / side]);

  return points.map(([x, y]) => `${(x + offsetX).toFixed(1)},${(y + offsetY).toFixed(1)}`).join(' ');
}
