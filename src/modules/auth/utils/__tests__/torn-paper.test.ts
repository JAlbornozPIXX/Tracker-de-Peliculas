import { seededRandom, tornPaperPoints } from '../torn-paper';

function parse(points: string): [number, number][] {
  return points.split(' ').map((pair) => pair.split(',').map(Number) as [number, number]);
}

describe('tornPaperPoints', () => {
  it('con la misma semilla dibuja siempre el mismo recorte', () => {
    expect(tornPaperPoints(70, 80, 7)).toBe(tornPaperPoints(70, 80, 7));
    expect(tornPaperPoints(70, 80, 7)).not.toBe(tornPaperPoints(70, 80, 8));
  });

  it('todos los puntos quedan dentro del rectángulo, metidos a lo más roughness', () => {
    const points = parse(tornPaperPoints(70, 80, 3, { roughness: 4 }));
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(70);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(80);
      // Cada punto está cerca de algún borde: no hay picos hacia el centro.
      expect(Math.min(x, 70 - x, y, 80 - y)).toBeLessThanOrEqual(4.05);
    }
  });

  it('respeta el desplazamiento', () => {
    const points = parse(tornPaperPoints(20, 20, 1, { offsetX: 5, offsetY: 10 }));
    expect(Math.min(...points.map(([x]) => x))).toBeGreaterThanOrEqual(5);
    expect(Math.min(...points.map(([, y]) => y))).toBeGreaterThanOrEqual(10);
  });
});

describe('seededRandom', () => {
  it('da números entre 0 y 1, repetibles con la semilla', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 20; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
