<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import FilterChip from '$components/FilterChip.svelte';
  import { NotificationRepository } from '$lib/db';
  import type { Notification } from '$lib/types/notifications';
  import { NotificationType } from '$lib/types/enums';
  import SubscriptionSettings from './notifications/SubscriptionSettings.svelte';

  const toast: any = getContext('toast');
  const notifRepo = new NotificationRepository();

  let notifications: Notification[] = [];
  let loading = true;
  let typeFilter = '';
  let showSettings = false;

  onMount(async () => {
    notifications = await notifRepo.getAll();
    loading = false;
  });

  $: filtered = typeFilter
    ? notifications.filter(n => n.eventType === typeFilter)
    : notifications;

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'eventType', label: 'Type', sortable: true },
    { key: 'createdAt', label: 'Date', sortable: true },
    { key: 'readAt', label: 'Read', sortable: false },
  ];

  async function markRead(id: string) {
    const notif = await notifRepo.getById(id);
    if (notif && !notif.readAt) {
      await notifRepo.put({ ...notif, readAt: new Date().toISOString() });
      notifications = await notifRepo.getAll();
      toast?.addToast('Marked as read', 'info');
    }
  }

  function handleRowAction(row: Record<string, unknown>, action: string) {
    if (action === 'read') markRead(row.id as string);
  }

  const notifActions = [{ label: 'Mark Read', action: 'read' }];
</script>

<PageHeader title="Notifications">
  <button on:click={() => showSettings = !showSettings}>
    {showSettings ? 'Inbox' : 'Preferences'}
  </button>
</PageHeader>

{#if showSettings}
  <div class="settings-section">
    <SubscriptionSettings />
  </div>
{:else}
  <div class="filters">
    <select bind:value={typeFilter} class="filter-select">
      <option value="">All Types</option>
      {#each Object.values(NotificationType) as t}
        <option value={t}>{t}</option>
      {/each}
    </select>
    {#if typeFilter}
      <FilterChip label="Type" value={typeFilter} on:remove={() => typeFilter = ''} />
    {/if}
  </div>

  <DataTable {columns} data={filtered} {loading} tableId="notifications-main"
    showActions={true} rowActions={notifActions} onRowAction={handleRowAction} />
{/if}

<style>
  button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .settings-section { padding: var(--spacing-md); }
  .filters { padding: 0 var(--spacing-md); display: flex; gap: var(--spacing-xs); align-items: center; }
  .filter-select { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.8rem; background: white; }
</style>
