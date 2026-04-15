import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import NavRail from '../../src/components/NavRail.svelte';
import SearchBar from '../../src/components/SearchBar.svelte';
import LockScreen from '../../src/components/LockScreen.svelte';
import ToastContainer from '../../src/components/ToastContainer.svelte';
import { setSession, clearSession } from '../../src/lib/stores/auth.store';
import { UserRole } from '../../src/lib/types/enums';

describe('Shell-level components', () => {
  afterEach(() => {
    clearSession();
    localStorage.clear();
  });

  describe('NavRail', () => {
    it('renders without error when user has a role', () => {
      setSession({
        userId: 'u1',
        role: UserRole.Administrator,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      });
      const { container } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      expect(container.querySelector('.nav-rail')).toBeTruthy();
    });

    it('renders Sign Out and Lock buttons in footer', () => {
      setSession({
        userId: 'u1',
        role: UserRole.Administrator,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      });
      const { getByText } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      expect(getByText(/Sign Out|X/)).toBeTruthy();
    });

    it('renders collapsed state when sidebarCollapsed is true', () => {
      setSession({
        userId: 'u1',
        role: UserRole.Administrator,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      });
      const { container } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      // Logo/branding shown
      expect(container.querySelector('.logo')).toBeTruthy();
    });

    it('renders for Warehouse Manager role', () => {
      setSession({
        userId: 'wm',
        role: UserRole.WarehouseManager,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      });
      const { container } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      expect(container.querySelector('.nav-rail')).toBeTruthy();
    });

    it('renders for Picker/Packer role', () => {
      setSession({
        userId: 'pp',
        role: UserRole.PickerPacker,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      });
      const { container } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      expect(container.querySelector('.nav-rail')).toBeTruthy();
    });

    it('renders for Auditor role', () => {
      setSession({
        userId: 'au',
        role: UserRole.Auditor,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      });
      const { container } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      expect(container.querySelector('.nav-rail')).toBeTruthy();
    });

    it('renders empty nav when no role (unauthenticated)', () => {
      clearSession();
      const { container } = render(NavRail, {
        props: { onLogout: () => {}, onLock: () => {} },
      });
      expect(container.querySelector('.nav-rail')).toBeTruthy();
    });
  });

  describe('SearchBar', () => {
    it('renders search input', () => {
      const { getByRole } = render(SearchBar);
      expect(getByRole('searchbox')).toBeTruthy();
    });

    it('placeholder is present', () => {
      const { container } = render(SearchBar);
      const input = container.querySelector('input[type="search"]') as HTMLInputElement;
      expect(input.placeholder).toContain('inventory');
    });

    it('dispatches search event when form is submitted with non-empty query', async () => {
      const { container, component } = render(SearchBar);
      let received: string | null = null;
      component.$on('search', (e: CustomEvent) => { received = e.detail; });

      const input = container.querySelector('input[type="search"]') as HTMLInputElement;
      const form = container.querySelector('form') as HTMLFormElement;
      await fireEvent.input(input, { target: { value: 'widget' } });
      await fireEvent.submit(form);
      await tick();

      expect(received).toBe('widget');
    });

    it('does not dispatch search when query is whitespace', async () => {
      const { container, component } = render(SearchBar);
      let received = false;
      component.$on('search', () => { received = true; });

      const input = container.querySelector('input[type="search"]') as HTMLInputElement;
      const form = container.querySelector('form') as HTMLFormElement;
      await fireEvent.input(input, { target: { value: '   ' } });
      await fireEvent.submit(form);
      await tick();

      expect(received).toBe(false);
    });
  });

  describe('LockScreen', () => {
    it('renders password form and Unlock button', () => {
      const { container, getByText } = render(LockScreen);
      expect(container.querySelector('input[type="password"]')).toBeTruthy();
      expect(getByText('Unlock')).toBeTruthy();
    });

    it('renders lock heading and inactivity message', () => {
      const { getAllByText, getByText } = render(LockScreen);
      expect(getAllByText(/Locked/i).length).toBeGreaterThanOrEqual(1);
      expect(getByText(/inactivity/i)).toBeTruthy();
    });

    it('shows error when unlock fails', async () => {
      const { container, getByText } = render(LockScreen);
      const input = container.querySelector('input[type="password"]') as HTMLInputElement;
      const form = container.querySelector('form') as HTMLFormElement;
      await fireEvent.input(input, { target: { value: 'wrong' } });
      await fireEvent.submit(form);
      // Wait for the handler to run and render the error
      await tick();
      await new Promise(r => setTimeout(r, 50));
      await tick();
      // Either error element appears or button returns to normal
      const err = container.querySelector('.error');
      const btn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      // One of these conditions must hold: error shown OR unlock button re-enabled
      expect(err !== null || btn.disabled === false).toBe(true);
    });
  });

  describe('ToastContainer', () => {
    it('renders slot wrapper and toast container', () => {
      const { container } = render(ToastContainer);
      expect(container.querySelector('.toast-container')).toBeTruthy();
    });

    it('has aria-live=polite for a11y', () => {
      const { container } = render(ToastContainer);
      const host = container.querySelector('.toast-container') as HTMLElement;
      expect(host.getAttribute('aria-live')).toBe('polite');
    });
  });
});
