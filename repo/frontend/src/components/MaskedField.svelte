<script lang="ts">
  import { currentRole } from '$lib/stores/auth.store';
  import { shouldMask, canRevealField, maskValue } from '$lib/security/masking';

  export let fieldName: string;
  export let value: string;
  export let maskType: 'email' | 'name' | 'default' = 'default';

  let revealed = false;

  $: role = $currentRole;
  $: isMasked = role ? shouldMask(fieldName, role) : true;
  $: canReveal = role ? canRevealField(fieldName, role) : false;
  $: displayValue = isMasked && !revealed ? maskValue(value, maskType) : value;

  function toggleReveal() {
    if (canReveal) revealed = !revealed;
  }
</script>

<span class="masked-field">
  <span class="field-value">{displayValue}</span>
  {#if isMasked && canReveal}
    <button class="reveal-btn" on:click={toggleReveal} aria-label={revealed ? 'Hide' : 'Reveal'}>
      {revealed ? 'Hide' : 'Reveal'}
    </button>
  {/if}
</span>

<style>
  .masked-field { display: inline-flex; align-items: center; gap: var(--spacing-xs); }
  .field-value { font-family: inherit; }
  .reveal-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.7rem;
    padding: 1px 6px;
    color: var(--color-primary);
  }
</style>
