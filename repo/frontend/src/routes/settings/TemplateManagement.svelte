<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { getTemplates, seedDefaultTemplates } from '$modules/notifications/template.service';
  import type { NotificationTemplate } from '$lib/types/notifications';

  const toast: any = getContext('toast');

  let templates: NotificationTemplate[] = [];
  let loading = true;

  onMount(async () => {
    await seedDefaultTemplates();
    templates = await getTemplates();
    loading = false;
  });

  function formatLabel(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
</script>

<div class="template-management">
  <h4>Notification Templates</h4>
  <p>Templates define the message format for each event type. External channels (SMS/email) store templates for audit purposes only — messages are not actually sent.</p>

  {#if loading}
    <p>Loading...</p>
  {:else}
    <div class="template-list">
      {#each templates as tmpl}
        <div class="template-card">
          <div class="tmpl-header">
            <span class="event-badge">{formatLabel(tmpl.eventType)}</span>
            <span class="channel-badge">{tmpl.channel}</span>
          </div>
          <p class="tmpl-subject"><strong>{tmpl.subject}</strong></p>
          <p class="tmpl-body">{tmpl.body}</p>
          <p class="tmpl-vars">Variables: {tmpl.variables.join(', ')}</p>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-xs); }
  p { font-size: 0.8rem; color: var(--color-muted); margin-bottom: var(--spacing-sm); }
  .template-card { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: var(--spacing-sm); margin-bottom: var(--spacing-sm); }
  .tmpl-header { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs); }
  .event-badge, .channel-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 9999px; background: #e5e7eb; }
  .tmpl-subject { font-size: 0.85rem; color: var(--color-text); margin-bottom: 2px; }
  .tmpl-body { font-size: 0.8rem; color: var(--color-muted); margin-bottom: 2px; }
  .tmpl-vars { font-size: 0.7rem; color: var(--color-muted); font-family: monospace; }
</style>
