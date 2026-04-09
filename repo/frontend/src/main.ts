import { initApp } from '$app/init';
import App from './App.svelte';
import './styles/global.css';

// Initialize database and app state BEFORE mounting the component tree.
// This guarantees IndexedDB is ready before any route or store accesses it.
initApp()
  .then(({ isFirstRun }) => {
    new App({
      target: document.getElementById('app')!,
      props: { isFirstRun },
    });
  })
  .catch((err) => {
    document.getElementById('app')!.innerHTML =
      `<div style="padding:2rem;color:#dc2626;">
        <h1>Initialization Failed</h1>
        <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
      </div>`;
  });
