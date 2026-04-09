<script lang="ts">
  import { link } from 'svelte-spa-router';
</script>

<div class="not-found">
  <h1>404</h1>
  <p>Page not found</p>
  <a href="/dashboard" use:link>Return to Dashboard</a>
</div>

<style>
  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    text-align: center;
  }
  h1 { font-size: 4rem; color: var(--color-muted); }
  p { color: var(--color-muted); margin-bottom: var(--spacing-md); }
  a { color: var(--color-primary); }
</style>
