import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/modules/auth/context/AuthContext';
import { syncQueue } from '@/modules/sync/queue';

// Sin un aviso de "volvió la red", mientras haya pendientes se reintenta cada tanto.
const RETRY_INTERVAL_MS = 15_000;

/**
 * Sube la cola de cambios pendientes: al abrir la app, al iniciar o recuperar
 * sesión (también cuando se renueva el token), al volver a primer plano y
 * periódicamente mientras quede algo. No renderiza nada.
 */
export function SyncManager() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const accessToken = session?.access_token;
  const hasPending = useSyncExternalStore(
    syncQueue.subscribe,
    () => syncQueue.pendingCount() > 0,
    () => false
  );

  useEffect(() => {
    syncQueue.setUser(userId).then(() => {
      if (userId) syncQueue.flush();
    });
  }, [userId, accessToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncQueue.flush();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => syncQueue.flush(), RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasPending]);

  return null;
}
