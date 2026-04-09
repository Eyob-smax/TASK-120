<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { login, createInitialAdmin, bootstrap } from '$lib/security/auth.service';
  import { setSession } from '$lib/stores/auth.store';
  import { appStore } from '$lib/stores/app.store';

  let isFirstRun = false;
  let username = '';
  let password = '';
  let displayName = '';
  let error = '';
  let loading = false;

  // Detect first-run directly on mount — no prop dependency from router
  onMount(async () => {
    try {
      const result = await bootstrap();
      isFirstRun = result.isFirstRun;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to check setup state';
    }
  });

  async function handleLogin() {
    error = '';
    loading = true;
    try {
      const session = await login(username, password);
      setSession(session);
      push('/dashboard');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Login failed';
    } finally {
      loading = false;
    }
  }

  async function handleSetup() {
    error = '';
    loading = true;
    try {
      await createInitialAdmin(username, password, { displayName });
      const session = await login(username, password);
      setSession(session);
      push('/dashboard');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Setup failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-page">
  <div class="login-card">
    <h1>ForgeOps</h1>
    <p class="subtitle">
      {isFirstRun ? 'Create your administrator account' : 'Sign in to continue'}
    </p>

    {#if error}
      <div class="error-message" role="alert">{error}</div>
    {/if}

    <form on:submit|preventDefault={isFirstRun ? handleSetup : handleLogin}>
      {#if isFirstRun}
        <label>
          Display Name
          <input type="text" bind:value={displayName} required placeholder="Your name" />
        </label>
      {/if}

      <label>
        Username
        <input type="text" bind:value={username} required placeholder="Username" autocomplete="username" />
      </label>

      <label>
        Password
        <input type="password" bind:value={password} required placeholder="Password" autocomplete="current-password" />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Please wait...' : isFirstRun ? 'Create Account' : 'Sign In'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--spacing-md);
  }
  .login-card {
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-xl);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
  h1 { margin-bottom: var(--spacing-xs); }
  .subtitle { color: var(--color-muted); margin-bottom: var(--spacing-lg); }
  .error-message {
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    background: #fef2f2;
    color: var(--color-danger);
    border-radius: var(--radius-sm);
  }
  label {
    display: block;
    margin-bottom: var(--spacing-md);
    font-weight: 500;
  }
  input {
    display: block;
    width: 100%;
    margin-top: var(--spacing-xs);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 1rem;
  }
  button {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 1rem;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
