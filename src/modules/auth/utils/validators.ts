const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function validateEmail(value: string): string | undefined {
  if (!value) return 'El correo es obligatorio';
  if (!EMAIL_REGEX.test(value)) return 'Ingresa un correo válido';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'La contraseña es obligatoria';
  if (value.length < 8) return 'Debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(value)) return 'Debe incluir al menos una mayúscula';
  if (!/[0-9]/.test(value)) return 'Debe incluir al menos un número';
  return undefined;
}
