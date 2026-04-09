<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { PreferenceStorage } from '$modules/preferences/storage';
  import { SearchHistory } from '$modules/preferences/search-history';

  const dispatch = createEventDispatcher<{ search: string }>();
  const storage = new PreferenceStorage();
  const history = new SearchHistory(storage);

  let query = '';
  let showHistory = false;
  let entries = history.getEntries();

  function handleSubmit() {
    if (!query.trim()) return;
    history.addEntry(query.trim());
    entries = history.getEntries();
    dispatch('search', query.trim());
    showHistory = false;
  }

  function selectEntry(entry: string) {
    query = entry;
    showHistory = false;
    dispatch('search', entry);
  }

  function handleFocus() {
    entries = history.getEntries();
    showHistory = entries.length > 0;
  }

  function handleBlur() {
    setTimeout(() => { showHistory = false; }, 200);
  }
</script>

<div class="search-bar">
  <form on:submit|preventDefault={handleSubmit}>
    <input
      type="search"
      bind:value={query}
      placeholder="Search..."
      on:focus={handleFocus}
      on:blur={handleBlur}
      aria-label="Global search"
    />
  </form>
  {#if showHistory}
    <ul class="history-dropdown" role="listbox">
      {#each entries.slice(0, 10) as entry}
        <li>
          <button on:mousedown|preventDefault={() => selectEntry(entry.query)} role="option">
            {entry.query}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search-bar { position: relative; flex: 1; max-width: 400px; }
  input {
    width: 100%;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
  }
  .history-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    list-style: none;
    z-index: 100;
    max-height: 240px;
    overflow-y: auto;
  }
  .history-dropdown button {
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .history-dropdown button:hover { background: #f3f4f6; }
</style>
