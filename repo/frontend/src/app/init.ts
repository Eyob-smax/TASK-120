import { initDatabase } from '$lib/db/connection';
import { bootstrap } from '$lib/security/auth.service';
import { setLoading, setError, setInitialized } from '$lib/stores/app.store';
import { BroadcastSync } from '$lib/services/broadcast';
import { reconcileOnStartup } from '$lib/services/reconciliation';
import { createLogger } from '$lib/logging/logger';

const logger = createLogger('app');
let broadcastSync: BroadcastSync | null = null;

export async function initApp(): Promise<{ isFirstRun: boolean }> {
  setLoading(true);

  try {
    await initDatabase();
    logger.info('Database initialized');

    const { isFirstRun } = await bootstrap();
    logger.info('Bootstrap complete', { isFirstRun });

    broadcastSync = new BroadcastSync();

    // Reconcile elapsed-time state (reservations, recycle bin, retries)
    if (!isFirstRun) {
      const summary = await reconcileOnStartup();
      logger.info('Reconciliation summary', summary);
    }

    setInitialized();
    return { isFirstRun };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'App initialization failed';
    setError(message);
    logger.error('Initialization failed', { error: message });
    throw error;
  }
}

export function getBroadcastSync(): BroadcastSync | null {
  return broadcastSync;
}
