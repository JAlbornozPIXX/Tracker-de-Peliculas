import { Alert, Platform } from 'react-native';

import { errorMessage, showAlert } from '../alert';

describe('showAlert', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it('en el teléfono usa Alert.alert', () => {
    Platform.OS = 'ios';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    showAlert('No se pudo guardar', 'Sin red');
    expect(alert).toHaveBeenCalledWith('No se pudo guardar', 'Sin red');
  });

  it('en web usa window.alert, que sí se ve', () => {
    Platform.OS = 'web';
    const alert = jest.fn();
    Object.defineProperty(globalThis, 'window', { value: { alert }, configurable: true });
    showAlert('No se pudo guardar', 'Sin red');
    showAlert('Listo');
    expect(alert).toHaveBeenNthCalledWith(1, 'No se pudo guardar\n\nSin red');
    expect(alert).toHaveBeenNthCalledWith(2, 'Listo');
  });
});

describe('errorMessage', () => {
  it('lee el mensaje de un Error y de un error plano de Supabase', () => {
    expect(errorMessage(new Error('falló'))).toBe('falló');
    expect(errorMessage({ message: 'column x does not exist', code: '42703' })).toBe('column x does not exist');
  });

  it('sin mensaje devuelve texto vacío', () => {
    expect(errorMessage(null)).toBe('');
    expect(errorMessage('texto')).toBe('');
    expect(errorMessage({ code: '42703' })).toBe('');
  });
});
