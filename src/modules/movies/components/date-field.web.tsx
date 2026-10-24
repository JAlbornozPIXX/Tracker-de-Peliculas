/**
 * En web el DateTimePicker de @expo/ui no renderiza nada, así que se usa el
 * selector de fecha del navegador. max deshabilita los días posteriores; el
 * valor se descarta si alguien escribe una fecha fuera de rango a mano.
 */
export function DateField({
  value,
  max,
  onChange,
  label = 'Fecha de la vista',
}: {
  value: string;
  max: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      max={max}
      aria-label={label}
      onChange={(event) => {
        const next = event.target.value;
        if (next && next <= max) onChange(next);
      }}
      style={{
        height: 46,
        padding: '0 14px',
        borderRadius: 14,
        backgroundColor: '#17151D',
        border: '1px solid #292431',
        color: '#F4F4F5',
        fontSize: 14,
        colorScheme: 'dark',
        fontFamily: 'inherit',
      }}
    />
  );
}
