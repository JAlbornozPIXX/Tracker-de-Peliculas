//Un periodo son dos fechas 'YYYY-MM-DD' inclusivas
export type StatsPeriod = {
  from: string;
  to: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

//month va de 1 (enero) a 12 (diciembre).
export function monthPeriod(year: number, month: number): StatsPeriod {
  //el día 0 del mes siguiente es el último día de este.
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

export function yearPeriod(year: number): StatsPeriod {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}
