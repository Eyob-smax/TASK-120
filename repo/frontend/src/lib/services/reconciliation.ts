import { releaseExpiredReservations } from '$modules/orders/order.service';
import { purgeExpired } from '$modules/files/recycle-bin.service';
import { processRetries } from '$modules/notifications/notification.service';
import { createLogger } from '$lib/logging';

const logger = createLogger('app');

export interface ReconciliationSummary {
  releasedReservations: number;
  purgedRecycleBin: number;
  processedRetries: number;
  scheduledNextRetries: number;
  skippedRetries: number;
}

export async function reconcileOnStartup(
  now: Date = new Date(),
): Promise<ReconciliationSummary> {
  logger.info('Starting startup reconciliation', { timestamp: now.toISOString() });

  // 1. Release expired reservations (free stock first)
  let releasedReservations = 0;
  try {
    const released = await releaseExpiredReservations(now);
    releasedReservations = released.length;
    if (releasedReservations > 0) {
      logger.info('Released expired reservations', { count: releasedReservations });
    }
  } catch (e) {
    logger.error('Failed to release expired reservations', { error: (e as Error).message });
  }

  // 2. Purge expired recycle bin entries
  let purgedRecycleBin = 0;
  try {
    purgedRecycleBin = await purgeExpired(now);
    if (purgedRecycleBin > 0) {
      logger.info('Purged expired recycle bin entries', { count: purgedRecycleBin });
    }
  } catch (e) {
    logger.error('Failed to purge recycle bin', { error: (e as Error).message });
  }

  // 3. Process overdue notification retries
  let processedRetries = 0;
  let scheduledNextRetries = 0;
  let skippedRetries = 0;
  try {
    const retryResult = await processRetries(now);
    processedRetries = retryResult.processed;
    scheduledNextRetries = retryResult.scheduledNext;
    skippedRetries = retryResult.skipped;
    if (processedRetries > 0) {
      logger.info('Processed overdue notification retries', retryResult);
    }
  } catch (e) {
    logger.error('Failed to process notification retries', { error: (e as Error).message });
  }

  const summary: ReconciliationSummary = {
    releasedReservations,
    purgedRecycleBin,
    processedRetries,
    scheduledNextRetries,
    skippedRetries,
  };

  logger.info('Startup reconciliation complete', summary);
  return summary;
}
