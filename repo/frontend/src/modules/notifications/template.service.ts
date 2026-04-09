import { Repository } from '$lib/db/repository';
import { STORE_NAMES } from '$lib/db/schema';
import { NotificationType, NotificationChannel } from '$lib/types/enums';
import type { NotificationTemplate } from '$lib/types/notifications';

const templateRepo = new Repository<NotificationTemplate>(STORE_NAMES.NOTIFICATION_TEMPLATES);

export const DEFAULT_TEMPLATES: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>[] = [
  {
    eventType: NotificationType.LowStock,
    channel: NotificationChannel.Inbox,
    subject: 'Low Stock Alert',
    body: 'SKU {{skuId}} in warehouse {{warehouseId}} is below safety threshold ({{currentStock}}/{{threshold}} units)',
    variables: ['skuId', 'warehouseId', 'currentStock', 'threshold'],
  },
  {
    eventType: NotificationType.WaveAssigned,
    channel: NotificationChannel.Inbox,
    subject: 'Wave Assigned',
    body: 'You have been assigned to wave {{waveNumber}} with {{stepCount}} pick steps',
    variables: ['waveNumber', 'stepCount'],
  },
  {
    eventType: NotificationType.DiscrepancyOpened,
    channel: NotificationChannel.Inbox,
    subject: 'Discrepancy Reported',
    body: 'A discrepancy has been reported for task {{taskId}}: {{description}}',
    variables: ['taskId', 'description'],
  },
  {
    eventType: NotificationType.DiscrepancyClosed,
    channel: NotificationChannel.Inbox,
    subject: 'Discrepancy Resolved',
    body: 'Discrepancy for task {{taskId}} has been resolved',
    variables: ['taskId'],
  },
  {
    eventType: NotificationType.FileVersionRollback,
    channel: NotificationChannel.Inbox,
    subject: 'File Version Rolled Back',
    body: 'File "{{fileName}}" has been rolled back to version {{versionNumber}}',
    variables: ['fileName', 'versionNumber'],
  },
  // SMS templates (audit-only — not actually sent)
  { eventType: NotificationType.LowStock, channel: NotificationChannel.Sms, subject: 'Low Stock', body: 'Low stock: SKU {{skuId}} at {{currentStock}}/{{threshold}}', variables: ['skuId', 'currentStock', 'threshold'] },
  { eventType: NotificationType.WaveAssigned, channel: NotificationChannel.Sms, subject: 'Wave Assigned', body: 'Wave {{waveNumber}} assigned, {{stepCount}} steps', variables: ['waveNumber', 'stepCount'] },
  { eventType: NotificationType.DiscrepancyOpened, channel: NotificationChannel.Sms, subject: 'Discrepancy', body: 'Discrepancy on task {{taskId}}', variables: ['taskId'] },
  { eventType: NotificationType.DiscrepancyClosed, channel: NotificationChannel.Sms, subject: 'Resolved', body: 'Discrepancy on task {{taskId}} resolved', variables: ['taskId'] },
  { eventType: NotificationType.FileVersionRollback, channel: NotificationChannel.Sms, subject: 'Rollback', body: 'File rolled back to v{{versionNumber}}', variables: ['versionNumber'] },
  // Email templates (audit-only — not actually sent)
  { eventType: NotificationType.LowStock, channel: NotificationChannel.Email, subject: 'Low Stock Alert', body: 'SKU {{skuId}} in warehouse {{warehouseId}} is below threshold ({{currentStock}}/{{threshold}} units).', variables: ['skuId', 'warehouseId', 'currentStock', 'threshold'] },
  { eventType: NotificationType.WaveAssigned, channel: NotificationChannel.Email, subject: 'Wave Assignment', body: 'You have been assigned to wave {{waveNumber}} with {{stepCount}} pick steps.', variables: ['waveNumber', 'stepCount'] },
  { eventType: NotificationType.DiscrepancyOpened, channel: NotificationChannel.Email, subject: 'Discrepancy Reported', body: 'A discrepancy has been reported for task {{taskId}}: {{description}}.', variables: ['taskId', 'description'] },
  { eventType: NotificationType.DiscrepancyClosed, channel: NotificationChannel.Email, subject: 'Discrepancy Resolved', body: 'Discrepancy for task {{taskId}} has been resolved.', variables: ['taskId'] },
  { eventType: NotificationType.FileVersionRollback, channel: NotificationChannel.Email, subject: 'File Version Rolled Back', body: 'File "{{fileName}}" has been rolled back to version {{versionNumber}}.', variables: ['fileName', 'versionNumber'] },
  // Official-account templates (audit-only — not actually sent)
  { eventType: NotificationType.LowStock, channel: NotificationChannel.OfficialAccount, subject: 'Low Stock', body: 'Low stock: SKU {{skuId}} at {{currentStock}}/{{threshold}}', variables: ['skuId', 'currentStock', 'threshold'] },
  { eventType: NotificationType.WaveAssigned, channel: NotificationChannel.OfficialAccount, subject: 'Wave Assigned', body: 'Wave {{waveNumber}} assigned, {{stepCount}} steps', variables: ['waveNumber', 'stepCount'] },
  { eventType: NotificationType.DiscrepancyOpened, channel: NotificationChannel.OfficialAccount, subject: 'Discrepancy', body: 'Discrepancy on task {{taskId}}: {{description}}', variables: ['taskId', 'description'] },
  { eventType: NotificationType.DiscrepancyClosed, channel: NotificationChannel.OfficialAccount, subject: 'Resolved', body: 'Discrepancy on task {{taskId}} resolved', variables: ['taskId'] },
  { eventType: NotificationType.FileVersionRollback, channel: NotificationChannel.OfficialAccount, subject: 'Rollback', body: 'File rolled back to v{{versionNumber}}', variables: ['versionNumber'] },
];

export async function getTemplates(): Promise<NotificationTemplate[]> {
  return templateRepo.getAll();
}

export async function getTemplateByEvent(
  eventType: NotificationType,
  channel: NotificationChannel,
): Promise<NotificationTemplate | undefined> {
  const all = await templateRepo.getAll();
  return all.find(t => t.eventType === eventType && t.channel === channel);
}

export async function createTemplate(
  template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
): Promise<NotificationTemplate> {
  const now = new Date().toISOString();
  const record: NotificationTemplate = {
    ...template,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  await templateRepo.add(record);
  return record;
}

export async function seedDefaultTemplates(): Promise<void> {
  const existing = await templateRepo.getAll();
  if (existing.length > 0) return;

  for (const tmpl of DEFAULT_TEMPLATES) {
    await createTemplate(tmpl);
  }
}
