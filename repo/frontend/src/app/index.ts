/**
 * Application Bootstrap
 *
 * App initialization, router setup, layout wiring, and global providers.
 * This module is the entry point composition root.
 */

export { initApp, getBroadcastSync } from './init';
export { checkRouteAccess, handleRouteFailure } from './route-guard';
