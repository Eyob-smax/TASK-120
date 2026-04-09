<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getPreviewType, createPreviewUrl, revokePreviewUrl } from '$modules/files/preview.service';
  import { FilePreviewType } from '$lib/types/enums';

  export let fileData: ArrayBuffer | null = null;
  export let mimeType = '';
  export let fileName = '';

  let previewUrl = '';
  let textContent = '';
  let previewType: FilePreviewType = FilePreviewType.Unsupported;

  $: if (fileData && mimeType) {
    cleanup();
    previewType = getPreviewType(mimeType);
    if (previewType === FilePreviewType.Text) {
      textContent = new TextDecoder().decode(fileData);
    } else if (previewType !== FilePreviewType.Unsupported) {
      previewUrl = createPreviewUrl(fileData, mimeType);
    }
  }

  function cleanup() {
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      previewUrl = '';
    }
    textContent = '';
  }

  onDestroy(cleanup);
</script>

<div class="file-preview">
  {#if !fileData}
    <p class="no-data">No file data to preview</p>
  {:else if previewType === FilePreviewType.Image}
    <img src={previewUrl} alt={fileName} />
  {:else if previewType === FilePreviewType.Pdf}
    <iframe src={previewUrl} title={fileName}></iframe>
  {:else if previewType === FilePreviewType.Text}
    <pre class="text-preview">{textContent}</pre>
  {:else if previewType === FilePreviewType.Audio}
    <audio controls src={previewUrl}>
      <track kind="captions" />
      Your browser does not support audio playback.
    </audio>
  {:else if previewType === FilePreviewType.Video}
    <video controls src={previewUrl}>
      <track kind="captions" />
      Your browser does not support video playback.
    </video>
  {:else}
    <div class="unsupported">
      <p>Preview not available for this file type</p>
      <p class="mime">{mimeType}</p>
    </div>
  {/if}
</div>

<style>
  .file-preview { padding: var(--spacing-sm); }
  img { max-width: 100%; height: auto; border-radius: var(--radius-sm); }
  iframe { width: 100%; height: 500px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  .text-preview { max-height: 400px; overflow: auto; padding: var(--spacing-sm); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; }
  audio, video { width: 100%; }
  .unsupported { text-align: center; padding: var(--spacing-xl); color: var(--color-muted); }
  .mime { font-size: 0.75rem; font-family: monospace; margin-top: var(--spacing-xs); }
  .no-data { text-align: center; color: var(--color-muted); padding: var(--spacing-md); }
</style>
