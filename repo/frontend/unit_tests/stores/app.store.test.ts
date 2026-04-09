import { describe, it, expect, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  appStore,
  setLoading,
  setError,
  clearError,
  toggleSidebar,
  setInitialized,
} from '../../src/lib/stores/app.store';

describe('App Store', () => {
  afterEach(() => {
    appStore.set({
      loading: false,
      error: null,
      sidebarCollapsed: false,
      initialized: false,
    });
  });

  it('has correct initial state', () => {
    const state = get(appStore);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.initialized).toBe(false);
  });

  it('setLoading updates loading state', () => {
    setLoading(true);
    expect(get(appStore).loading).toBe(true);

    setLoading(false);
    expect(get(appStore).loading).toBe(false);
  });

  it('setError sets error and clears loading', () => {
    setLoading(true);
    setError('Something went wrong');
    const state = get(appStore);
    expect(state.error).toBe('Something went wrong');
    expect(state.loading).toBe(false);
  });

  it('clearError sets error to null', () => {
    setError('error');
    clearError();
    expect(get(appStore).error).toBeNull();
  });

  it('toggleSidebar flips collapsed state', () => {
    expect(get(appStore).sidebarCollapsed).toBe(false);
    toggleSidebar();
    expect(get(appStore).sidebarCollapsed).toBe(true);
    toggleSidebar();
    expect(get(appStore).sidebarCollapsed).toBe(false);
  });

  it('setInitialized sets initialized and clears loading', () => {
    setLoading(true);
    setInitialized();
    const state = get(appStore);
    expect(state.initialized).toBe(true);
    expect(state.loading).toBe(false);
  });
});
