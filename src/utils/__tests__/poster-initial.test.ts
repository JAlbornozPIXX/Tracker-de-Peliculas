import { posterInitial } from '../poster-initial';

describe('posterInitial', () => {
  it('salta signos al inicio del título', () => {
    expect(posterInitial('¡Canta!')).toBe('C');
    expect(posterInitial('[seed] Título 01')).toBe('S');
    expect(posterInitial('"Élite"')).toBe('É');
  });

  it('acepta números y títulos sin letras', () => {
    expect(posterInitial('300')).toBe('3');
    expect(posterInitial('?!')).toBe('?');
    expect(posterInitial('')).toBe('');
  });
});
