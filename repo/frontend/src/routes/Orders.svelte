<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import { orderStore, loadOrders, cancelOrder, releaseExpiredReservations, updateOrderActivity } from '$modules/orders';
  import { currentRole } from '$lib/stores/auth.store';
  import { canMutate } from '$lib/security/permissions';
  import CreateOrderDrawer from './orders/CreateOrderDrawer.svelte';

  const toast: any = getContext('toast');

  let loading = true;
  let showCreate = false;
  let expiryInterval: ReturnType<typeof setInterval>;

  onMount(async () => {
    await loadOrders();
    loading = false;

    // Periodic reservation expiry check every 60 seconds during active session
    expiryInterval = setInterval(async () => {
      const released = await releaseExpiredReservations();
      if (released.length > 0) {
        await loadOrders();
        toast?.addToast(`Auto-released ${released.length} expired reservations`, 'info');
      }
    }, 60_000);
  });

  onDestroy(() => {
    if (expiryInterval) clearInterval(expiryInterval);
  });

  $: role = $currentRole;
  $: canCreate = role ? canMutate(role, 'orders.create') : false;

  const columns = [
    { key: 'orderNumber', label: 'Order #', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdBy', label: 'Created By', sortable: true },
    { key: 'createdAt', label: 'Date', sortable: true },
  ];

  async function handleCancel(orderId: string) {
    try {
      await cancelOrder(orderId);
      await loadOrders();
      toast?.addToast('Order cancelled, reservations released', 'success');
    } catch (e: any) {
      toast?.addToast(e.message || 'Cancel failed', 'error');
    }
  }

  async function handleReleaseExpired() {
    const released = await releaseExpiredReservations();
    await loadOrders();
    toast?.addToast(`Released ${released.length} expired reservations`, 'info');
  }

  function handleRowAction(row: Record<string, unknown>, action: string) {
    if (action === 'cancel') handleCancel(row.id as string);
    if (action === 'activity') refreshActivity(row.id as string);
  }

  async function refreshActivity(orderId: string) {
    await updateOrderActivity(orderId);
    toast?.addToast('Order activity refreshed — reservation timer reset', 'info');
  }

  $: orderActions = [
    { label: 'Refresh Activity', action: 'activity' },
    ...(canCreate ? [{ label: 'Cancel', action: 'cancel', variant: 'danger' }] : []),
  ];
</script>

<PageHeader title="Orders">
  {#if canCreate}
    <button on:click={() => showCreate = true}>Create Order</button>
  {/if}
  <button on:click={handleReleaseExpired}>Release Expired</button>
  <a href="#/orders/waves">Wave Planning</a>
</PageHeader>

<DataTable {columns} data={$orderStore} {loading} tableId="orders-main"
  showActions={true} rowActions={orderActions} onRowAction={handleRowAction} />

<CreateOrderDrawer bind:open={showCreate} />

<style>
  button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
  }
</style>
