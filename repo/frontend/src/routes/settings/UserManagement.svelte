<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { createUser } from '$lib/security/auth.service';
  import { Repository } from '$lib/db/repository';
  import { STORE_NAMES } from '$lib/db/schema';
  import { UserRole } from '$lib/types/enums';
  import type { User } from '$lib/types/auth';

  const toast: any = getContext('toast');
  const userRepo = new Repository<User>(STORE_NAMES.USERS);

  let users: User[] = [];
  let username = '';
  let password = '';
  let displayName = '';
  let role = UserRole.PickerPacker;
  let error = '';
  let submitting = false;

  const roles = Object.values(UserRole);

  onMount(async () => {
    users = await userRepo.getAll();
  });

  async function handleCreate() {
    error = '';
    submitting = true;
    try {
      await createUser(username, password, role, { displayName });
      users = await userRepo.getAll();
      toast?.addToast(`User "${username}" created`, 'success');
      username = ''; password = ''; displayName = '';
    } catch (e: any) {
      error = e.message || 'Failed to create user';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="user-management">
  <h4>User Management</h4>

  <div class="user-list">
    {#each users as user}
      <div class="user-row">
        <span class="user-name">{user.profile.displayName}</span>
        <span class="user-username">@{user.username}</span>
        <span class="user-role">{user.role}</span>
      </div>
    {/each}
  </div>

  <div class="create-form">
    <h5>Create New User</h5>
    {#if error}<div class="form-error">{error}</div>{/if}
    <label>Display Name <input bind:value={displayName} required /></label>
    <label>Username <input bind:value={username} required /></label>
    <label>Password <input type="password" bind:value={password} required /></label>
    <label>Role
      <select bind:value={role}>
        {#each roles as r}<option value={r}>{r}</option>{/each}
      </select>
    </label>
    <button on:click={handleCreate} disabled={submitting}>
      {submitting ? 'Creating...' : 'Create User'}
    </button>
  </div>
</div>

<style>
  h4 { font-size: 0.875rem; margin-bottom: var(--spacing-sm); }
  h5 { font-size: 0.85rem; margin: var(--spacing-md) 0 var(--spacing-sm); }
  .user-row { display: flex; gap: var(--spacing-md); align-items: center; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border); font-size: 0.85rem; }
  .user-name { font-weight: 500; }
  .user-username { color: var(--color-muted); }
  .user-role { font-size: 0.75rem; padding: 2px 8px; background: #e5e7eb; border-radius: 9999px; }
  label { display: block; margin-bottom: var(--spacing-sm); font-size: 0.85rem; font-weight: 500; }
  input, select { display: block; width: 100%; margin-top: 2px; padding: var(--spacing-xs); border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
  button { padding: var(--spacing-xs) var(--spacing-md); background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; }
  button:disabled { opacity: 0.6; }
  .form-error { padding: var(--spacing-xs); background: #fef2f2; color: var(--color-danger); border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm); font-size: 0.85rem; }
</style>
