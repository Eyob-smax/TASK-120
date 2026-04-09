<script lang="ts">
  import PageHeader from '$components/PageHeader.svelte';
  import { currentRole } from '$lib/stores/auth.store';
  import { isReadOnly } from '$lib/security/permissions';
  import { UserRole } from '$lib/types/enums';
  import UserManagement from './settings/UserManagement.svelte';
  import SafetyStockSettings from './settings/SafetyStockSettings.svelte';
  import TemplateManagement from './settings/TemplateManagement.svelte';
  import BandwidthSettings from './settings/BandwidthSettings.svelte';
  import ZonePrioritySettings from './settings/ZonePrioritySettings.svelte';

  $: role = $currentRole;
  $: isAdmin = role === UserRole.Administrator;
  $: readOnly = role ? isReadOnly(role) : true;
</script>

<PageHeader title="Settings" />

<div class="settings-page">
  {#if isAdmin}
    <section class="settings-section">
      <UserManagement />
    </section>

    <section class="settings-section">
      <SafetyStockSettings />
    </section>

    <section class="settings-section">
      <TemplateManagement />
    </section>
  {/if}

  <section class="settings-section">
    <BandwidthSettings />
  </section>

  <section class="settings-section">
    <ZonePrioritySettings />
  </section>

  <section class="settings-section">
    <h4>Display Preferences</h4>
    <p>Column layouts and filter states are automatically saved per screen and persist across sessions.</p>
    {#if readOnly}
      <p class="readonly-notice">You have read-only access. Contact an administrator for changes.</p>
    {/if}
  </section>
</div>

<style>
  .settings-page { padding: var(--spacing-md); max-width: 700px; }
  .settings-section { margin-bottom: var(--spacing-xl); padding-bottom: var(--spacing-lg); border-bottom: 1px solid var(--color-border); }
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-sm); }
  p { font-size: 0.85rem; color: var(--color-muted); }
  .readonly-notice { color: var(--color-warning); font-style: italic; margin-top: var(--spacing-sm); }
</style>
