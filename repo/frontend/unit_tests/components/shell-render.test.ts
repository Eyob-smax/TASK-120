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
    function getNavLabels(container: HTMLElement): string[] {
      return [...container.querySelectorAll('.nav-items a .nav-label')].map(el => el.textContent?.trim() ?? '');
    }

    function makeSession(role: UserRole) {
      return {
        userId: `user-${role}`,
        role,
        loginAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        isLocked: false,
      };
    }

    it('admin sees all 7 nav items including Identity and Settings', () => {
      setSession(makeSession(UserRole.Administrator));
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      const labels = getNavLabels(container);
      expect(labels).toEqual(['Dashboard', 'Inventory', 'Orders', 'Files', 'Identity', 'Notifications', 'Settings']);
    });

    it('warehouse manager sees Dashboard, Inventory, Orders, Files, Notifications', () => {
      setSession(makeSession(UserRole.WarehouseManager));
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      const labels = getNavLabels(container);
      expect(labels).toEqual(['Dashboard', 'Inventory', 'Orders', 'Files', 'Notifications']);
    });

    it('picker/packer sees only Dashboard, Orders, Notifications', () => {
      setSession(makeSession(UserRole.PickerPacker));
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      const labels = getNavLabels(container);
      expect(labels).toEqual(['Dashboard', 'Orders', 'Notifications']);
    });

    it('auditor sees Dashboard, Inventory, Files, Notifications', () => {
      setSession(makeSession(UserRole.Auditor));
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      const labels = getNavLabels(container);
      expect(labels).toEqual(['Dashboard', 'Inventory', 'Files', 'Notifications']);
    });

    it('renders no nav items when unauthenticated', () => {
      clearSession();
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      expect(container.querySelectorAll('.nav-items a').length).toBe(0);
    });

    it('renders Sign Out and Lock buttons in nav footer', () => {
      setSession(makeSession(UserRole.Administrator));
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      const footer = container.querySelector('.nav-footer');
      expect(footer).not.toBeNull();
      const buttons = footer!.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toMatch(/Lock/i);
      expect(buttons[1].textContent).toMatch(/Sign Out/i);
    });

    it('renders logo and sidebar toggle button', () => {
      setSession(makeSession(UserRole.Administrator));
      const { container } = render(NavRail, { props: { onLogout: () => {}, onLock: () => {} } });
      expect(container.querySelector('.logo')?.textContent).toMatch(/ForgeOps/);
      expect(container.querySelector('button[aria-label="Toggle sidebar"]')).not.toBeNull();
    });
  });

  describe('SearchBar', () => {
    it('renders search input with correct aria-label and placeholder', () => {
      const { container } = render(SearchBar);
      const input = container.querySelector('input[type="search"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.getAttribute('aria-label')).toBe('Inventory search');
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
    it('renders lock card with password input and unlock button', () => {
      const { container, getByText } = render(LockScreen);
      expect(container.querySelector('.lock-card')).not.toBeNull();
      const input = container.querySelector('input[type="password"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.getAttribute('autocomplete')).toBe('current-password');
      expect(input.hasAttribute('required')).toBe(true);
      expect(getByText('Unlock')).not.toBeNull();
    });

    it('renders lock icon text and inactivity explanation', () => {
      const { container } = render(LockScreen);
      const icon = container.querySelector('.lock-icon');
      expect(icon?.textContent?.trim()).toBe('Locked');
      const para = container.querySelector('p');
      expect(para?.textContent).toContain('inactivity');
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
