import { writable } from 'svelte/store';

export interface AppState {
  loading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
  initialized: boolean;
}

const initialState: AppState = {
  loading: false,
  error: null,
  sidebarCollapsed: false,
  initialized: false,
};

export const appStore = writable<AppState>(initialState);

export function setLoading(loading: boolean): void {
  appStore.update(s => ({ ...s, loading }));
}

export function setError(error: string): void {
  appStore.update(s => ({ ...s, error, loading: false }));
}

export function clearError(): void {
  appStore.update(s => ({ ...s, error: null }));
}

export function toggleSidebar(): void {
  appStore.update(s => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }));
}

export function setInitialized(): void {
  appStore.update(s => ({ ...s, initialized: true, loading: false }));
}
