import { useSyncExternalStore } from 'react';

import { syncQueue } from '@/modules/sync/queue';

/** true mientras haya cambios de esta película guardados solo en el teléfono. */
export function usePendingSync(movieId: number | null) {
  const getSnapshot = () => movieId != null && syncQueue.hasPending(movieId);
  return useSyncExternalStore(syncQueue.subscribe, getSnapshot, getSnapshot);
}
