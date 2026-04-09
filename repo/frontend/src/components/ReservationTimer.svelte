<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getExpiresAt } from '$modules/orders/reservation-timer';

  export let lastActivityAt: string;
  export let status: string;

  let timeRemaining = '';
  let isExpired = false;
  let interval: ReturnType<typeof setInterval>;

  function update() {
    if (status !== 'active') {
      timeRemaining = status;
      isExpired = status === 'released';
      return;
    }
    const expiresAt = getExpiresAt(lastActivityAt);
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) {
      timeRemaining = 'Expired';
      isExpired = true;
    } else {
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      timeRemaining = `${mins}:${secs.toString().padStart(2, '0')}`;
      isExpired = false;
    }
  }

  onMount(() => {
    update();
    interval = setInterval(update, 1000);
  });

  onDestroy(() => { if (interval) clearInterval(interval); });
</script>

<span class="timer" class:expired={isExpired} class:active={!isExpired && status === 'active'}>
  {timeRemaining}
</span>

<style>
  .timer { font-size: 0.8rem; padding: 2px 8px; border-radius: 9999px; font-weight: 500; }
  .active { background: #dbeafe; color: var(--color-primary); }
  .expired { background: #fef2f2; color: var(--color-danger); }
</style>
