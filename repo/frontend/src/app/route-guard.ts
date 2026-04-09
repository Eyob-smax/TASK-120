import { get } from 'svelte/store';
import { push } from 'svelte-spa-router';
import { isAuthenticated, currentRole } from '$lib/stores/auth.store';
import { canAccess } from '$lib/security/permissions';

const PUBLIC_ROUTES = new Set(['/']);

export function checkRouteAccess(path: string): boolean {
  if (PUBLIC_ROUTES.has(path)) return true;

  const authenticated = get(isAuthenticated);
  if (!authenticated) return false;

  const role = get(currentRole);
  if (!role) return false;

  return canAccess(role, path);
}

export function handleRouteFailure(path: string): void {
  const authenticated = get(isAuthenticated);
  if (!authenticated) {
    push('/');
  } else {
    push('/dashboard');
  }
}
