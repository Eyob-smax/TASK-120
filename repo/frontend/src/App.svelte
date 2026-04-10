<script lang="ts">
  import Router from 'svelte-spa-router';
  import { onMount, onDestroy } from 'svelte';
  import { routes } from '$routes/routes';
  import { checkRouteAccess, handleRouteFailure } from '$app/route-guard';
  import { isAuthenticated, isLocked, currentRole, clearSession, lockSession, setSession } from '$lib/stores/auth.store';
  import { appStore } from '$lib/stores/app.store';
  import { logout, lock } from '$lib/security/auth.service';
  import { IdleLockMonitor } from '$lib/security/idle-monitor';
  import { releaseExpiredReservations } from '$modules/orders';
  import { push, querystring } from 'svelte-spa-router';
  import NavRail from '$components/NavRail.svelte';
  import SearchBar from '$components/SearchBar.svelte';
  import LockScreen from '$components/LockScreen.svelte';
  import ToastContainer from '$components/ToastContainer.svelte';
  import LoadingSpinner from '$components/LoadingSpinner.svelte';
  import ErrorBanner from '$components/ErrorBanner.svelte';

  export let isFirstRun = false;

  const idleMonitor = new IdleLockMonitor();
  let expiryInterval: ReturnType<typeof setInterval> | null = null;

  $: authenticated = $isAuthenticated;
  $: locked = $isLocked;
  $: appError = $appStore.error;
  $: appLoading = $appStore.loading;

  // Start/stop idle monitor and reservation expiry based on auth state
  $: if (authenticated) {
    idleMonitor.start(handleIdleLock);
    if (!expiryInterval) {
      expiryInterval = setInterval(async () => {
        try { await releaseExpiredReservations(); } catch { /* background cleanup */ }
      }, 60_000);
    }
  } else {
    idleMonitor.stop();
    if (expiryInterval) { clearInterval(expiryInterval); expiryInterval = null; }
  }

  function handleIdleLock() {
    lock();
    lockSession();
  }

  function handleLogout() {
    idleMonitor.stop();
    if (expiryInterval) { clearInterval(expiryInterval); expiryInterval = null; }
    logout();
    clearSession();
  }

  function handleLock() {
    lock();
    lockSession();
  }

  function conditionsFailed(event: { detail: { location: string } }) {
    const path = event.detail.location;
    if (!checkRouteAccess(path)) {
      handleRouteFailure(path);
    }
  }

  function handleGlobalSearch(query: string) {
    // Inventory search only — routes to inventory page with query param
    push(`/inventory?q=${encodeURIComponent(query)}`);
  }

  onDestroy(() => {
    idleMonitor.stop();
    if (expiryInterval) { clearInterval(expiryInterval); expiryInterval = null; }
  });
</script>

<ToastContainer>
  {#if locked}
    <LockScreen />
  {/if}

  {#if authenticated}
    <div class="app-layout">
      <NavRail onLogout={handleLogout} onLock={handleLock} />
      <div class="app-content">
        <header class="app-topbar">
          <SearchBar on:search={(e) => handleGlobalSearch(e.detail)} />
        </header>
        {#if appError}
          <ErrorBanner message={appError} onDismiss={() => appStore.update(s => ({ ...s, error: null }))} />
        {/if}
        <main class="app-main">
          <Router {routes} on:conditionsFailed={conditionsFailed} />
        </main>
      </div>
    </div>
  {:else}
    <Router {routes} on:conditionsFailed={conditionsFailed} />
  {/if}
</ToastContainer>

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
  }
  .app-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .app-topbar {
    display: flex;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
    background: white;
  }
  .app-main {
    flex: 1;
    overflow-y: auto;
  }
</style>
