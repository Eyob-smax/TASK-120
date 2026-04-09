<script lang="ts">
  import { onMount } from 'svelte';
  import { NotificationType, NotificationChannel } from '$lib/types/enums';
  import { getSubscriptions, updateSubscription, getDefaultSubscriptions } from '$modules/notifications/subscription.service';
  import { getCurrentSession } from '$lib/security/auth.service';

  let subscriptions: Record<string, boolean> = {};
  let channelSelections: Record<string, NotificationChannel[]> = {};
  let loading = true;

  const eventTypes = Object.values(NotificationType);
  const allChannels = Object.values(NotificationChannel);

  onMount(async () => {
    const userId = getCurrentSession()?.userId;
    if (userId) {
      const subs = await getSubscriptions(userId);
      for (const s of subs) {
        subscriptions[s.eventType] = s.enabled;
        channelSelections[s.eventType] = s.channels;
      }
    }
    // Default unset types: enabled with all 4 channels
    const defaults = getDefaultSubscriptions();
    for (const d of defaults) {
      if (subscriptions[d.eventType] === undefined) subscriptions[d.eventType] = true;
      if (!channelSelections[d.eventType]) channelSelections[d.eventType] = [...d.channels];
    }
    loading = false;
  });

  async function toggleEnabled(eventType: string) {
    const newValue = !subscriptions[eventType];
    subscriptions[eventType] = newValue;
    subscriptions = subscriptions;
    await persistSubscription(eventType);
  }

  async function toggleChannel(eventType: string, channel: NotificationChannel) {
    let channels = channelSelections[eventType] ?? [];
    if (channels.includes(channel)) {
      channels = channels.filter(c => c !== channel);
    } else {
      channels = [...channels, channel];
    }
    // Inbox is always required
    if (!channels.includes(NotificationChannel.Inbox)) {
      channels = [NotificationChannel.Inbox, ...channels];
    }
    channelSelections[eventType] = channels;
    channelSelections = channelSelections;
    await persistSubscription(eventType);
  }

  async function persistSubscription(eventType: string) {
    const userId = getCurrentSession()?.userId;
    if (userId) {
      await updateSubscription(
        userId,
        eventType as NotificationType,
        channelSelections[eventType] ?? [NotificationChannel.Inbox],
        subscriptions[eventType] ?? true,
      );
    }
  }

  function formatLabel(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
</script>

<div class="subscription-settings">
  <h4>Notification Preferences</h4>
  <p>Choose which events and channels you want to be notified through.</p>

  {#if loading}
    <p>Loading preferences...</p>
  {:else}
    {#each eventTypes as eventType}
      <div class="sub-row">
        <label class="sub-toggle">
          <input type="checkbox" checked={subscriptions[eventType] ?? true} on:change={() => toggleEnabled(eventType)} />
          <span class="event-label">{formatLabel(eventType)}</span>
        </label>
        <div class="channel-checks">
          {#each allChannels as channel}
            <label class="channel-toggle" title="{channel === 'inbox' ? 'Delivered in-app' : 'Audit-only, not sent externally'}">
              <input
                type="checkbox"
                checked={channelSelections[eventType]?.includes(channel) ?? false}
                disabled={channel === NotificationChannel.Inbox}
                on:change={() => toggleChannel(eventType, channel)}
              />
              <span class="channel-name">{channel}</span>
            </label>
          {/each}
        </div>
      </div>
    {/each}
    <p class="channel-note">Inbox: delivered in-app. SMS / Email / Official Account: stored as queued attempts for audit only — not sent externally.</p>
  {/if}
</div>

<style>
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-xs); }
  p { font-size: 0.8rem; color: var(--color-muted); margin-bottom: var(--spacing-md); }
  .sub-row { padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--color-border); }
  .sub-toggle { display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer; font-size: 0.875rem; margin-bottom: var(--spacing-xs); }
  .event-label { font-weight: 500; }
  .channel-checks { display: flex; gap: var(--spacing-md); padding-left: 1.5rem; }
  .channel-toggle { display: flex; align-items: center; gap: 3px; font-size: 0.75rem; color: var(--color-muted); cursor: pointer; }
  .channel-name { text-transform: capitalize; }
  .channel-note { font-size: 0.75rem; color: var(--color-muted); font-style: italic; margin-top: var(--spacing-sm); }
</style>
