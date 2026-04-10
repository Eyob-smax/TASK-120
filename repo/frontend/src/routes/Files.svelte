<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import PageHeader from '$components/PageHeader.svelte';
  import DataTable from '$components/DataTable.svelte';
  import { fileStore, loadFiles, optimisticDeleteFile, transferStore, loadTransfers, resumeTransfer, getTransferSession, getFile, completeTransfer, ChunkScheduler, uploadNewVersion, createVersion } from '$modules/files';
  import { getCurrentSession, getCurrentDEK } from '$lib/security/auth.service';
  import { decryptBinary, base64ToUint8Array } from '$lib/security/crypto';
  import { currentRole } from '$lib/stores/auth.store';
  import { canMutate } from '$lib/security/permissions';
  import { TransferState } from '$lib/types/enums';
  import { PreferenceStorage } from '$modules/preferences/storage';
  import UploadModal from './files/UploadModal.svelte';
  import VersionDrawer from './files/VersionDrawer.svelte';
  import RecycleBinView from './files/RecycleBinView.svelte';
  import Drawer from '$components/Drawer.svelte';
  import FilePreview from '$components/FilePreview.svelte';
  import { canPreview } from '$modules/files/preview.service';
  import { ChunkRepository } from '$lib/db';

  const toast: any = getContext('toast');

  let loading = true;
  let showUpload = false;
  let showVersions = false;
  let selectedFileId = '';
  let showRecycleBin = false;
  let recycleBinRef: RecycleBinView;
  let showPreview = false;
  let previewData: ArrayBuffer | null = null;
  let previewMimeType = '';
  let previewFileName = '';
  let transferFileNames: Record<string, string> = {};
  let versionFileInput: HTMLInputElement;
  let versionTargetFileId = '';

  onMount(async () => {
    await loadFiles();
    await loadTransfers();
    await resolveTransferNames();
    loading = false;
  });

  $: incompleteTransfers = $transferStore.filter(
    t => t.status === TransferState.Paused || t.status === TransferState.Active
  );

  async function resolveTransferNames() {
    const names: Record<string, string> = {};
    for (const t of $transferStore) {
      const file = await getFile(t.fileId);
      names[t.fileId] = file?.name ?? t.fileId;
    }
    transferFileNames = names;
  }

  async function handleResume(sessionId: string, e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const session = await getTransferSession(sessionId);
      if (!session) throw new Error('Session not found');

      if (session.status === TransferState.Paused) {
        await resumeTransfer(sessionId);
      }

      const scheduler = new ChunkScheduler();
      const prefs = new PreferenceStorage();
      const savedCap = prefs.get<number>('bandwidth:cap');
      if (savedCap && savedCap > 0) scheduler.setBandwidthCap(savedCap);

      // Resolve the active version so resumed chunks are tagged correctly
      const fileRecord = await getFile(session.fileId);
      const versionId = fileRecord?.currentVersionId || undefined;

      await scheduler.scheduleChunks(sessionId, buffer, undefined, versionId);
      await completeTransfer(sessionId);
      await loadTransfers();
      await loadFiles();
      await resolveTransferNames();
      toast?.addToast('Transfer resumed and completed', 'success');
    } catch (err: any) {
      toast?.addToast(err.message || 'Resume failed', 'error');
    }
  }

  function triggerVersionUpload(fileId: string) {
    versionTargetFileId = fileId;
    versionFileInput.click();
  }

  async function handleVersionUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !versionTargetFileId) return;

    try {
      const buffer = await file.arrayBuffer();
      const userId = getCurrentSession()?.userId ?? 'unknown';
      const result = await uploadNewVersion(versionTargetFileId, buffer, userId);

      if (result.deduplicated) {
        toast?.addToast('File content unchanged (same hash)', 'info');
        target.value = '';
        return;
      }

      if (result.session) {
        const scheduler = new ChunkScheduler();
        const prefs = new PreferenceStorage();
        const savedCap = prefs.get<number>('bandwidth:cap');
        if (savedCap && savedCap > 0) scheduler.setBandwidthCap(savedCap);

        // Create the version record first so chunks are tagged with its id.
        // This prevents prior version chunks from blocking new chunk writes.
        const { version } = await createVersion(versionTargetFileId, result.file.sha256, result.file.size, userId);
        await scheduler.scheduleChunks(result.session.id, buffer, undefined, version.id);
        await completeTransfer(result.session.id);
      }

      await loadFiles();
      toast?.addToast(`New version uploaded for "${result.file.name}"`, 'success');
    } catch (err: any) {
      toast?.addToast(err.message || 'Version upload failed', 'error');
    } finally {
      target.value = '';
      versionTargetFileId = '';
    }
  }

  $: role = $currentRole;
  $: canUpload = role ? canMutate(role, 'files.upload') : false;
  $: canDelete = role ? canMutate(role, 'files.delete') : false;

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'mimeType', label: 'Type', sortable: true },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'createdBy', label: 'Owner', sortable: true },
    { key: 'createdAt', label: 'Date', sortable: true },
  ];

  function openVersions(fileId: string) {
    selectedFileId = fileId;
    showVersions = true;
  }

  async function handleDelete(fileId: string) {
    try {
      const userId = getCurrentSession()?.userId ?? 'unknown';
      await optimisticDeleteFile(fileId, userId);
      toast?.addToast('File moved to recycle bin', 'success');
    } catch (e: any) {
      toast?.addToast(e.message || 'Delete failed', 'error');
    }
  }

  async function openPreview(fileId: string, mimeType: string, fileName: string) {
    const chunkRepo = new ChunkRepository();
    // Resolve chunks by version for correctness; fall back to fileId for backward compat
    const fileRecord = $fileStore.find(f => f.id === fileId);
    const versionId = fileRecord?.currentVersionId;
    let chunks = versionId ? await chunkRepo.getByVersion(versionId) : [];
    if (chunks.length === 0) chunks = await chunkRepo.getByFile(fileId);
    if (chunks.length > 0) {
      const sorted = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const totalSize = sorted.reduce((sum, c) => sum + c.size, 0);
      const buffer = new ArrayBuffer(totalSize);
      const view = new Uint8Array(buffer);
      let offset = 0;
      const dek = getCurrentDEK();
      for (const chunk of sorted) {
        let chunkData: ArrayBuffer;
        if (chunk.iv && dek) {
          const ivBytes = base64ToUint8Array(chunk.iv);
          chunkData = await decryptBinary(chunk.data, ivBytes, dek);
        } else {
          chunkData = chunk.data;
        }
        view.set(new Uint8Array(chunkData), offset);
        offset += chunk.size;
      }
      previewData = buffer;
    } else {
      previewData = new ArrayBuffer(0);
    }
    previewMimeType = mimeType;
    previewFileName = fileName;
    showPreview = true;
  }

  function handleRowAction(row: Record<string, unknown>, action: string) {
    if (action === 'preview') openPreview(row.id as string, row.mimeType as string, row.name as string);
    if (action === 'versions') openVersions(row.id as string);
    if (action === 'upload-version') triggerVersionUpload(row.id as string);
    if (action === 'delete') handleDelete(row.id as string);
  }

  $: fileActions = [
    { label: 'Preview', action: 'preview' },
    { label: 'Versions', action: 'versions' },
    ...(canUpload ? [{ label: 'Upload New Version', action: 'upload-version' }] : []),
    ...(canDelete ? [{ label: 'Delete', action: 'delete', variant: 'danger' }] : []),
  ];

  function toggleRecycleBin() {
    showRecycleBin = !showRecycleBin;
    if (showRecycleBin) recycleBinRef?.load();
  }
</script>

<PageHeader title="File Management">
  {#if canUpload}
    <button on:click={() => showUpload = true}>Upload</button>
  {/if}
  <button on:click={toggleRecycleBin}>
    {showRecycleBin ? 'Show Files' : 'Recycle Bin'}
  </button>
</PageHeader>

{#if showRecycleBin}
  <div class="recycle-section">
    <RecycleBinView bind:this={recycleBinRef} />
  </div>
{:else}
  {#if incompleteTransfers.length > 0}
    <div class="incomplete-transfers">
      <h5>Incomplete Transfers</h5>
      {#each incompleteTransfers as transfer (transfer.id)}
        <div class="transfer-row">
          <span class="transfer-name">{transferFileNames[transfer.fileId] ?? transfer.fileId}</span>
          <span class="transfer-progress">{transfer.completedChunks}/{transfer.totalChunks} chunks</span>
          <span class="status-badge status-{transfer.status}">{transfer.status}</span>
          {#if canUpload}
            <label class="resume-btn">
              Resume
              <input type="file" class="sr-only" on:change={(e) => handleResume(transfer.id, e)} />
            </label>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <DataTable {columns} data={$fileStore} {loading} tableId="files-main"
    showActions={true} rowActions={fileActions} onRowAction={handleRowAction} />
{/if}

<input type="file" class="sr-only" bind:this={versionFileInput} on:change={handleVersionUpload} />
<UploadModal bind:open={showUpload} />
<VersionDrawer bind:open={showVersions} fileId={selectedFileId} />
<Drawer open={showPreview} title="File Preview — {previewFileName}" on:close={() => { showPreview = false; previewData = null; }}>
  <FilePreview fileData={previewData} mimeType={previewMimeType} fileName={previewFileName} />
</Drawer>

<style>
  button {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .recycle-section { padding: var(--spacing-md); }
  .incomplete-transfers { padding: var(--spacing-md); border-bottom: 1px solid var(--color-border); }
  .incomplete-transfers h5 { margin: 0 0 var(--spacing-sm) 0; font-size: 0.85rem; }
  .transfer-row { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; font-size: 0.8rem; }
  .transfer-name { flex: 1; }
  .transfer-progress { color: var(--color-muted); }
  .status-badge { padding: 2px 6px; border-radius: var(--radius-sm); font-size: 0.75rem; text-transform: capitalize; }
  .status-paused { background: #fef3c7; color: #92400e; }
  .status-active { background: #dbeafe; color: #1e40af; }
  .resume-btn { padding: var(--spacing-xs) var(--spacing-sm); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: white; cursor: pointer; font-size: 0.8rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
</style>
