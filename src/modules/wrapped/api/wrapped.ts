import { getViewRecords } from '@/modules/stats/api/stats';
import { yearPeriod } from '@/modules/stats/utils/period';
import { summarizeYear, type WrappedSummary } from '@/modules/wrapped/utils/summary';

//Una sola lectura del año para los 4 datos de la tarjeta, en vez de una por cada función de stats.ts
export async function getWrapped(userId: string, year: number): Promise<WrappedSummary> {
  return summarizeYear(year, await getViewRecords(userId, yearPeriod(year)));
}
