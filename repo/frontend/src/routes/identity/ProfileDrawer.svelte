<script lang="ts">
  import Drawer from '$components/Drawer.svelte';
  import MaskedField from '$components/MaskedField.svelte';
  import type { FaceProfile } from '$lib/types/identity';

  export let open = false;
  export let profile: FaceProfile | null = null;
</script>

<Drawer {open} title={profile?.name ?? 'Profile Detail'} on:close={() => { open = false; }}>
  {#if profile}
    <div class="profile-detail">
      <div class="field"><label>Name</label><MaskedField fieldName="displayName" value={profile.name} maskType="name" /></div>
      <div class="field"><label>Group</label><span>{profile.groupId ?? 'None'}</span></div>
      <div class="field"><label>Enrolled By</label><span>{profile.enrolledBy}</span></div>
      <div class="field"><label>Enrolled At</label><span>{new Date(profile.enrolledAt).toLocaleString()}</span></div>
      <div class="field"><label>Vector</label><span>{profile.vectorId ? 'Present' : 'Not enrolled'}</span></div>

      {#if Object.keys(profile.attributes).length > 0}
        <h4>Attributes</h4>
        {#each Object.entries(profile.attributes) as [key, value]}
          <div class="field">
            <label>{key}</label>
            <MaskedField fieldName="attributes" {value} />
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</Drawer>

<style>
  .profile-detail { padding: var(--spacing-sm) 0; }
  .field { display: flex; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border); font-size: 0.875rem; }
  .field label { font-weight: 500; color: var(--color-muted); }
  h4 { font-size: 0.85rem; margin-top: var(--spacing-md); margin-bottom: var(--spacing-xs); }
</style>
