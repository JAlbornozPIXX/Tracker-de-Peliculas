import { validateEmail, validatePassword } from '@/modules/auth/utils/validators';

describe('validateEmail', () => {
  it('exige un correo', () => {
    expect(validateEmail('')).toBe('El correo es obligatorio');
  });

  it.each(['sin-arroba', 'a@b', 'a@b.c', 'con espacio@mail.com'])('rechaza %s', (value) => {
    expect(validateEmail(value)).toBe('Ingresa un correo válido');
  });

  it.each(['ana@mail.com', 'Ana.Perez+cine@uni.edu.cl'])('acepta %s', (value) => {
    expect(validateEmail(value)).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('exige una contraseña', () => {
    expect(validatePassword('')).toBe('La contraseña es obligatoria');
  });

  it('exige al menos 8 caracteres', () => {
    expect(validatePassword('Ab1')).toBe('Debe tener al menos 8 caracteres');
  });

  it('exige una mayúscula', () => {
    expect(validatePassword('abcdefg1')).toBe('Debe incluir al menos una mayúscula');
  });

  it('exige un número', () => {
    expect(validatePassword('Abcdefgh')).toBe('Debe incluir al menos un número');
  });

  it('acepta una contraseña válida', () => {
    expect(validatePassword('Abcdefg1')).toBeUndefined();
  });
});
