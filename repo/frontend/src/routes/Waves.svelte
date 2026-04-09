<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import { waveStore, loadWaves, loadOrders, loadTasks, taskStore, startWave, completeWave, assignTask, canProceedToPacking, startTask, completeTask } from '$modules/orders';
  import { currentRole } from '$lib/stores/auth.store';
  import { getCurrentSession } from '$lib/security/auth.service';
  import { canMutate } from '$lib/security/permissions';
  import WavePlanModal from './orders/WavePlanModal.svelte';
  import DiscrepancyDrawer from './orders/DiscrepancyDrawer.svelte';
  import Modal from '$components/Modal.svelte';
  import { PreferenceStorage } from '$modules/preferences/storage';

  const toast: any = getContext('toast');

  let loading = true;
  let showPlan = false;
  let showDiscrepancy = false;
  let selectedTaskId = '';
  let showAssign = false;
  let assignWaveId = '';
  let assignPickerId = '';

  onMount(async () => {
    await Promise.all([loadWaves(), loadOrders(), loadTasks()]);
    loading = false;
  });

  $: role = $currentRole;
  $: canPlan = role ? canMutate(role, 'waves.plan') : false;
  $: canExecuteTask = role ? canMutate(role, 'tasks.start') : false;

  const waveColumns = [
    { key: 'waveNumber', label: 'Wave #', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'lineCount', label: 'Lines', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ];

  const taskColumns = [
    { key: 'waveId', label: 'Wave', sortable: true },
    { key: 'pickerId', label: 'Picker', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'assignedAt', label: 'Assigned', sortable: true },
  ];

  function handleWaveAction(row: Record<string, unknown>, action: string) {
    const waveId = row.id as string;
    if (action === 'start') handleStart(waveId);
    if (action === 'complete') handleComplete(waveId);
    if (action === 'assign') { assignWaveId = waveId; showAssign = true; }
  }

  function handleTaskAction(row: Record<string, unknown>, action: string) {
    if (action === 'discrepancies') {
      selectedTaskId = row.id as string;
      showDiscrepancy = true;
    }
    if (action === 'check-packing') checkPacking(row.id as string);
    if (action === 'start-task') handleStartTask(row.id as string);
    if (action === 'complete-task') handleCompleteTask(row.id as string);
  }

  async function handleStart(waveId: string) {
    try {
      await startWave(waveId);
      await loadWaves();
      toast?.addToast('Wave started', 'success');
    } catch (e: any) { toast?.addToast(e.message, 'error'); }
  }

  async function handleComplete(waveId: string) {
    try {
      await completeWave(waveId);
      await loadWaves();
      toast?.addToast('Wave completed', 'success');
    } catch (e: any) { toast?.addToast(e.message, 'error'); }
  }

  async function handleAssign() {
    if (!assignWaveId || !assignPickerId) return;
    try {
      const prefs = new PreferenceStorage();
      const savedZones = prefs.get<string[]>('pickpath:zones') ?? ['A', 'B', 'C', 'D'];
      await assignTask(assignWaveId, assignPickerId, { sortBy: 'zone_then_bin', zonePriority: savedZones });
      await loadTasks();
      toast?.addToast('Task assigned to picker', 'success');
      showAssign = false;
      assignPickerId = '';
    } catch (e: any) { toast?.addToast(e.message, 'error'); }
  }

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      await loadTasks();
      toast?.addToast('Task started', 'success');
    } catch (e: any) { toast?.addToast(e.message, 'error'); }
  }

  async function handleCompleteTask(taskId: string) {
    try {
      await completeTask(taskId);
      await loadTasks();
      toast?.addToast('Task completed', 'success');
    } catch (e: any) { toast?.addToast(e.message, 'error'); }
  }

  async function checkPacking(taskId: string) {
    const canPack = await canProceedToPacking(taskId);
    if (canPack) {
      toast?.addToast('All discrepancies verified. Packing can proceed.', 'success');
    } else {
      toast?.addToast('Cannot proceed to packing. Open discrepancies require verification.', 'warning');
    }
  }

  const waveActions = [
    { label: 'Start', action: 'start' },
    { label: 'Assign', action: 'assign' },
    { label: 'Complete', action: 'complete' },
  ];

  const taskActions = [
    { label: 'Start Task', action: 'start-task' },
    { label: 'Discrepancies', action: 'discrepancies' },
    { label: 'Check Packing', action: 'check-packing' },
    { label: 'Complete Task', action: 'complete-task' },
  ];
</script>

<PageHeader title="Wave Planning">
  {#if canPlan}
    <button on:click={() => showPlan = true}>Plan Wave</button>
  {/if}
  <a href="#/orders">Back to Orders</a>
</PageHeader>

<h3 class="section-title">Waves</h3>
<DataTable columns={waveColumns} data={$waveStore} {loading} tableId="waves-main"
  showActions={canPlan} rowActions={waveActions} onRowAction={handleWaveAction} />

<h3 class="section-title">Assigned Tasks</h3>
<DataTable columns={taskColumns} data={$taskStore} loading={false} tableId="tasks-main"
  showActions={canExecuteTask} rowActions={taskActions} onRowAction={handleTaskAction} />

<WavePlanModal bind:open={showPlan} />
<DiscrepancyDrawer bind:open={showDiscrepancy} taskId={selectedTaskId} />

<Modal open={showAssign} title="Assign Task" on:close={() => { showAssign = false; }} on:confirm={handleAssign}>
  <label>Picker ID <input bind:value={assignPickerId} placeholder="Enter picker user ID" /></label>
</Modal>

<style>
  button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .section-title { padding: var(--spacing-sm) var(--spacing-md); font-size: 0.9rem; color: var(--color-muted); border-bottom: 1px solid var(--color-border); }
  label { display: block; font-size: 0.875rem; }
  input { display: block; width: 100%; margin-top: 4px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
</style>
