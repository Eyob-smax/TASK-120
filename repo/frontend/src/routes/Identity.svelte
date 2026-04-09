<script lang="ts">
  import { onMount } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import { getProfiles } from '$modules/identity/identity.service';
  import type { FaceProfile } from '$lib/types/identity';
  import ProfileDrawer from './identity/ProfileDrawer.svelte';
  import ImportExportModal from './identity/ImportExportModal.svelte';
  import EnrollmentFlow from './identity/EnrollmentFlow.svelte';

  let profiles: FaceProfile[] = [];
  let loading = true;
  let showProfile = false;
  let showImport = false;
  let showExport = false;
  let showEnroll = false;
  let selectedProfile: FaceProfile | null = null;

  onMount(async () => {
    profiles = await getProfiles();
    loading = false;
  });

  const columns = [
    { key: 'name', label: 'Name', sortable: true, maskField: 'displayName', maskType: 'name' as const },
    { key: 'groupId', label: 'Group', sortable: true },
    { key: 'enrolledBy', label: 'Enrolled By', sortable: true },
    { key: 'enrolledAt', label: 'Enrolled', sortable: true },
  ];

  const profileActions = [
    { label: 'View', action: 'view' },
  ];

  function handleRowAction(row: Record<string, unknown>, action: string) {
    if (action === 'view') {
      selectedProfile = row as unknown as FaceProfile;
      showProfile = true;
    }
  }

  async function refresh() {
    profiles = await getProfiles();
  }

  let prevShowEnroll = false;
  $: {
    if (prevShowEnroll && !showEnroll) {
      refresh();
    }
    prevShowEnroll = showEnroll;
  }
</script>

<PageHeader title="Identity Management">
  <button on:click={() => showEnroll = true}>Enroll Face</button>
  <button on:click={() => showImport = true}>Import</button>
  <button on:click={() => showExport = true}>Export</button>
</PageHeader>

<DataTable {columns} data={profiles} {loading} tableId="identity-main"
  showActions={true} rowActions={profileActions} onRowAction={handleRowAction} />

<ProfileDrawer bind:open={showProfile} profile={selectedProfile} />
<ImportExportModal bind:open={showImport} mode="import" />
<ImportExportModal bind:open={showExport} mode="export" />
<EnrollmentFlow bind:open={showEnroll} />

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
