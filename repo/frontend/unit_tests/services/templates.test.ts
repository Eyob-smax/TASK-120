import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  getTemplates,
  getTemplateByEvent,
  seedDefaultTemplates,
  DEFAULT_TEMPLATES,
} from '../../src/modules/notifications/template.service';
import { NotificationType, NotificationChannel } from '../../src/lib/types/enums';

describe('Notification Template Service', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  it('DEFAULT_TEMPLATES covers all 5 event types', () => {
    const eventTypes = new Set(DEFAULT_TEMPLATES.map(t => t.eventType));
    expect(eventTypes.size).toBe(5);
    expect(eventTypes.has(NotificationType.LowStock)).toBe(true);
    expect(eventTypes.has(NotificationType.WaveAssigned)).toBe(true);
    expect(eventTypes.has(NotificationType.DiscrepancyOpened)).toBe(true);
    expect(eventTypes.has(NotificationType.DiscrepancyClosed)).toBe(true);
    expect(eventTypes.has(NotificationType.FileVersionRollback)).toBe(true);
  });

  it('seedDefaultTemplates creates all default templates', async () => {
    await seedDefaultTemplates();
    const templates = await getTemplates();
    expect(templates.length).toBe(DEFAULT_TEMPLATES.length);
  });

  it('seedDefaultTemplates is idempotent', async () => {
    await seedDefaultTemplates();
    await seedDefaultTemplates();
    const templates = await getTemplates();
    expect(templates.length).toBe(DEFAULT_TEMPLATES.length);
  });

  it('getTemplateByEvent finds correct template', async () => {
    await seedDefaultTemplates();
    const tmpl = await getTemplateByEvent(NotificationType.LowStock, NotificationChannel.Inbox);
    expect(tmpl).toBeDefined();
    expect(tmpl!.subject).toContain('Low Stock');
    expect(tmpl!.variables).toContain('skuId');
  });

  it('getTemplateByEvent returns undefined for nonexistent', async () => {
    await seedDefaultTemplates();
    // Use a combination that has no template seeded
    const tmpl = await getTemplateByEvent('nonexistent_event' as any, NotificationChannel.Sms);
    expect(tmpl).toBeUndefined();
  });

  it('each template has subject, body, and variables', async () => {
    await seedDefaultTemplates();
    const templates = await getTemplates();
    for (const tmpl of templates) {
      expect(tmpl.subject).toBeTruthy();
      expect(tmpl.body).toBeTruthy();
      expect(tmpl.variables.length).toBeGreaterThan(0);
    }
  });
});
