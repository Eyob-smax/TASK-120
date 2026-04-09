<script lang="ts">
  import { unlock } from '$lib/security/auth.service';
  import { setSession } from '$lib/stores/auth.store';

  let password = '';
  let error = '';
  let loading = false;

  async function handleUnlock() {
    error = '';
    loading = true;
    try {
      const session = await unlock(password);
      setSession(session);
      password = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unlock failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="lock-screen">
  <div class="lock-card">
    <div class="lock-icon">Locked</div>
    <p>Session locked due to inactivity</p>

    {#if error}
      <div class="error" role="alert">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleUnlock}>
      <input
        type="password"
        bind:value={password}
        placeholder="Enter password to unlock"
        required
        autocomplete="current-password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Unlocking...' : 'Unlock'}
      </button>
    </form>
  </div>
</div>

<style>
  .lock-screen {
    position: fixed;
    inset: 0;
    background: rgba(255,255,255,0.95);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lock-card {
    text-align: center;
    padding: var(--spacing-xl);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: white;
    width: 100%;
    max-width: 360px;
  }
  .lock-icon { font-size: 1.5rem; font-weight: 700; color: var(--color-muted); margin-bottom: var(--spacing-sm); }
  p { color: var(--color-muted); margin-bottom: var(--spacing-md); font-size: 0.875rem; }
  .error {
    padding: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    background: #fef2f2;
    color: var(--color-danger);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }
  input {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    margin-bottom: var(--spacing-sm);
  }
  button {
    width: 100%;
    padding: var(--spacing-sm);
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; }
</style>
