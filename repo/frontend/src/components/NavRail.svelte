<script lang="ts">
  import { link } from 'svelte-spa-router';
  import active from 'svelte-spa-router/active';
  import { currentRole } from '$lib/stores/auth.store';
  import { appStore, toggleSidebar } from '$lib/stores/app.store';
  import { canAccess } from '$lib/security/permissions';
  import { routeConfig } from '$routes/routes';
  import type { UserRole } from '$lib/types/enums';

  export let onLogout: () => void = () => {};
  export let onLock: () => void = () => {};

  $: collapsed = $appStore.sidebarCollapsed;
  $: role = $currentRole;

  $: navItems = Object.entries(routeConfig)
    .filter(([path, config]) => {
      if (!config.showInNav) return false;
      if (!role) return false;
      return canAccess(role, path);
    })
    .map(([path, config]) => ({ path, label: config.label, icon: config.icon }));
</script>

<nav class="nav-rail" class:collapsed>
  <div class="nav-header">
    <span class="logo">{collapsed ? 'F' : 'ForgeOps'}</span>
    <button class="collapse-btn" on:click={toggleSidebar} aria-label="Toggle sidebar">
      {collapsed ? '>' : '<'}
    </button>
  </div>

  <ul class="nav-items">
    {#each navItems as item}
      <li>
        <a href={item.path} use:link use:active={{ className: 'active' }}>
          <span class="nav-icon">{item.icon.charAt(0).toUpperCase()}</span>
          {#if !collapsed}
            <span class="nav-label">{item.label}</span>
          {/if}
        </a>
      </li>
    {/each}
  </ul>

  <div class="nav-footer">
    <button on:click={onLock} title="Lock Screen">
      {collapsed ? 'L' : 'Lock'}
    </button>
    <button on:click={onLogout} title="Sign Out">
      {collapsed ? 'X' : 'Sign Out'}
    </button>
  </div>
</nav>

<style>
  .nav-rail {
    display: flex;
    flex-direction: column;
    width: 220px;
    height: 100vh;
    border-right: 1px solid var(--color-border);
    background: #f9fafb;
    transition: width 0.2s;
    flex-shrink: 0;
  }
  .nav-rail.collapsed { width: 56px; }
  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--color-border);
  }
  .logo { font-weight: 700; font-size: 1rem; }
  .collapse-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 2px 6px;
    font-size: 0.75rem;
  }
  .nav-items {
    list-style: none;
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-sm) 0;
  }
  .nav-items a {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    color: var(--color-text);
    text-decoration: none;
    font-size: 0.875rem;
    border-radius: var(--radius-sm);
    margin: 0 var(--spacing-xs);
  }
  .nav-items a:hover { background: #e5e7eb; }
  .nav-items a :global(.active) { background: #dbeafe; color: var(--color-primary); }
  .nav-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--color-border);
    border-radius: var(--radius-sm);
  }
  .nav-footer {
    padding: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .nav-footer button {
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8rem;
  }
  .nav-footer button:hover { background: #e5e7eb; }
</style>
