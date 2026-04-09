/**
 * Orders Module
 *
 * Order lifecycle management including stock reservation at creation,
 * auto-release after 30 minutes inactivity or immediate on cancel,
 * wave planning (25 lines/wave default), picker task assignment,
 * pick-path optimization (zone priority then bin alphanumeric sort),
 * and discrepancy verification before packing.
 */

// Pure logic
export { sortPickPath } from './pick-path';
export { isReservationExpired, getExpiredReservations, getExpiresAt } from './reservation-timer';

// Order service
export {
  createOrder,
  cancelOrder,
  releaseReservation,
  releaseExpiredReservations,
  updateOrderActivity,
  getOrder,
  getOrders,
  getReservationsByOrder,
} from './order.service';

// Wave service
export {
  planWave,
  assignTask,
  startWave,
  completeWave,
  startTask,
  completeTask,
} from './wave.service';

// Discrepancy service
export {
  reportDiscrepancy,
  reviewDiscrepancy,
  verifyDiscrepancy,
  resolveDiscrepancy,
  canProceedToPacking,
  addAttachment,
  getDiscrepanciesByTask,
} from './discrepancy.service';

// Stores
export {
  orderStore,
  reservationStore,
  waveStore,
  taskStore,
  loadOrders,
  loadReservations,
  loadWaves,
  loadTasks,
} from './order.store';
