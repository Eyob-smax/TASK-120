import { wrap } from 'svelte-spa-router/wrap';
import type { UserRole } from '$lib/types/enums';
import { checkRouteAccess } from '$app/route-guard';
import Login from './Login.svelte';
import Dashboard from './Dashboard.svelte';
import Inventory from './Inventory.svelte';
import Ledger from './Ledger.svelte';
import Orders from './Orders.svelte';
import Waves from './Waves.svelte';
import Files from './Files.svelte';
import Identity from './Identity.svelte';
import Notifications from './Notifications.svelte';
import Settings from './Settings.svelte';
import NotFound from './NotFound.svelte';

export interface RouteConfig {
  label: string;
  icon: string;
  showInNav: boolean;
  requiredRoles?: UserRole[];
}

export const routeConfig: Record<string, RouteConfig> = {
  '/': { label: 'Login', icon: 'login', showInNav: false },
  '/dashboard': { label: 'Dashboard', icon: 'dashboard', showInNav: true },
  '/inventory': { label: 'Inventory', icon: 'inventory', showInNav: true },
  '/inventory/ledger': { label: 'Ledger', icon: 'ledger', showInNav: false },
  '/orders': { label: 'Orders', icon: 'orders', showInNav: true },
  '/orders/waves': { label: 'Waves', icon: 'waves', showInNav: false },
  '/files': { label: 'Files', icon: 'files', showInNav: true },
  '/identity': { label: 'Identity', icon: 'identity', showInNav: true },
  '/notifications': { label: 'Notifications', icon: 'notifications', showInNav: true },
  '/settings': { label: 'Settings', icon: 'settings', showInNav: true },
};

function guard(path: string) {
  return () => checkRouteAccess(path);
}

export const routes = {
  '/': Login,
  '/dashboard': wrap({ component: Dashboard, conditions: [guard('/dashboard')] }),
  '/inventory': wrap({ component: Inventory, conditions: [guard('/inventory')] }),
  '/inventory/ledger': wrap({ component: Ledger, conditions: [guard('/inventory/ledger')] }),
  '/orders': wrap({ component: Orders, conditions: [guard('/orders')] }),
  '/orders/waves': wrap({ component: Waves, conditions: [guard('/orders/waves')] }),
  '/files': wrap({ component: Files, conditions: [guard('/files')] }),
  '/identity': wrap({ component: Identity, conditions: [guard('/identity')] }),
  '/notifications': wrap({ component: Notifications, conditions: [guard('/notifications')] }),
  '/settings': wrap({ component: Settings, conditions: [guard('/settings')] }),
  '*': NotFound,
};
