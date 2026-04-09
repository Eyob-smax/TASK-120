/**
 * Notifications Module
 *
 * In-app inbox items delivered offline only. External channels as
 * templates with queued attempts and retry rules for audit purposes.
 */

// Pure logic
export { getNextRetryTimestamp, getOverdueAttempts, isMaxRetriesReached } from './retry-scheduler';

// Notification service
export {
  createInboxItem,
  markAsRead,
  queueExternalAttempt,
  processRetries,
  getInbox,
  getUnread,
  getAttemptLog,
  dispatchNotification,
} from './notification.service';

// Subscription service
export {
  getSubscriptions,
  updateSubscription,
  isSubscribed,
  getDefaultSubscriptions,
} from './subscription.service';

// Template service
export {
  getTemplates,
  getTemplateByEvent,
  createTemplate,
  seedDefaultTemplates,
  DEFAULT_TEMPLATES,
} from './template.service';

// Store
export {
  notificationStore,
  unreadCountStore,
  loadNotifications,
} from './notification.store';
