import { Alert, AlertButton, Platform } from 'react-native';

import { confirmUnsavedChanges, errorMessage, showAlert } from '../alert';

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

describe('confirmUnsavedChanges', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it('en el teléfono ofrece seguir editando, descartar o guardar', () => {
    Platform.OS = 'android';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onSave = jest.fn();
    const onDiscard = jest.fn();
    confirmUnsavedChanges({ onSave, onDiscard });

    const buttons = alert.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((button) => button.text)).toEqual(['Seguir editando', 'Descartar', 'Guardar']);
    buttons[1].onPress!();
    expect(onDiscard).toHaveBeenCalledTimes(1);
    buttons[2].onPress!();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('en web aceptar sale sin guardar y cancelar se queda', () => {
    Platform.OS = 'web';
    const confirm = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    Object.defineProperty(globalThis, 'window', { value: { confirm }, configurable: true });
    const onDiscard = jest.fn();
    confirmUnsavedChanges({ onSave: jest.fn(), onDiscard });
    confirmUnsavedChanges({ onSave: jest.fn(), onDiscard });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(onDiscard).toHaveBeenCalledTimes(1);
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
