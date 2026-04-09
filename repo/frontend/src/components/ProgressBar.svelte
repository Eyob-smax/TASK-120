<script lang="ts">
  export let value = 0;
  export let max = 100;
  export let label = '';

  $: percent = max > 0 ? Math.round((value / max) * 100) : 0;
</script>

<div class="progress-container">
  {#if label}<span class="progress-label">{label}</span>{/if}
  <div class="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
    <div class="progress-fill" style="width:{percent}%"></div>
  </div>
  <span class="progress-text">{percent}%</span>
</div>

<style>
  .progress-container { display: flex; align-items: center; gap: var(--spacing-sm); }
  .progress-label { font-size: 0.8rem; color: var(--color-muted); min-width: 60px; }
  .progress-track { flex: 1; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--color-primary); border-radius: 4px; transition: width 0.3s; }
  .progress-text { font-size: 0.8rem; color: var(--color-muted); min-width: 36px; text-align: right; }
</style>
