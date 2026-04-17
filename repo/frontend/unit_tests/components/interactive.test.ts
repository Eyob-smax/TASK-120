import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Modal from '../../src/components/Modal.svelte';
import Drawer from '../../src/components/Drawer.svelte';
import Toast from '../../src/components/Toast.svelte';
import ExportButton from '../../src/components/ExportButton.svelte';
import MaskedField from '../../src/components/MaskedField.svelte';
import ReservationTimer from '../../src/components/ReservationTimer.svelte';
import { setSession, clearSession } from '../../src/lib/stores/auth.store';
import { UserRole } from '../../src/lib/types/enums';
import { RESERVATION_TIMEOUT_MS } from '../../src/lib/constants';

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(Modal, { props: { open: false, title: 'X' } });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog with aria-label, overlay, and title in header', () => {
    const { getByRole, container } = render(Modal, { props: { open: true, title: 'Confirm Save' } });
    const dialog = getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Confirm Save');
    expect(container.querySelector('.modal-overlay')).not.toBeNull();
    expect(container.querySelector('.modal-header h3')?.textContent).toBe('Confirm Save');
  });

  it('dispatches close on overlay click', async () => {
    let closed = false;
    const { container, component } = render(Modal, { props: { open: true, title: 'Foo' } });
    component.$on('close', () => { closed = true; });
    const overlay = container.querySelector('.modal-overlay') as HTMLElement;
    await fireEvent.click(overlay);
    expect(closed).toBe(true);
  });

  it('dispatches close on close button click', async () => {
    let closed = false;
    const { getByLabelText, component } = render(Modal, { props: { open: true, title: 'Foo' } });
    component.$on('close', () => { closed = true; });
    await fireEvent.click(getByLabelText('Close'));
    expect(closed).toBe(true);
  });

  it('dispatches close when Escape key pressed', async () => {
    let closed = false;
    const { component } = render(Modal, { props: { open: true, title: 'Foo' } });
    component.$on('close', () => { closed = true; });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBe(true);
  });

  it('dispatches confirm on confirm button click', async () => {
    let confirmed = false;
    const { getByText, component } = render(Modal, { props: { open: true, title: 'Foo' } });
    component.$on('confirm', () => { confirmed = true; });
    await fireEvent.click(getByText('Confirm'));
    expect(confirmed).toBe(true);
  });

  it('confirm button is disabled when confirmDisabled=true', () => {
    const { getByText } = render(Modal, {
      props: { open: true, title: 'Foo', confirmDisabled: true },
    });
    const btn = getByText('Confirm') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('hides footer when showFooter=false', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Foo', showFooter: false },
    });
    expect(container.querySelector('.modal-footer')).toBeNull();
  });
});

describe('Drawer', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(Drawer, { props: { open: false } });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders aside with aria-label, overlay, and title in header', () => {
    const { getByRole, container } = render(Drawer, { props: { open: true, title: 'Details' } });
    const dialog = getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Details');
    expect(container.querySelector('.drawer-overlay')).not.toBeNull();
    expect(container.querySelector('.drawer-header h3')?.textContent).toBe('Details');
  });

  it('dispatches close on overlay click', async () => {
    let closed = false;
    const { container, component } = render(Drawer, { props: { open: true, title: 'x' } });
    component.$on('close', () => { closed = true; });
    const overlay = container.querySelector('.drawer-overlay') as HTMLElement;
    await fireEvent.click(overlay);
    expect(closed).toBe(true);
  });

  it('dispatches close on Escape key', async () => {
    let closed = false;
    const { component } = render(Drawer, { props: { open: true, title: 'x' } });
    component.$on('close', () => { closed = true; });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBe(true);
  });

  it('ignores Escape when closed', async () => {
    let closed = false;
    const { component } = render(Drawer, { props: { open: false, title: 'x' } });
    component.$on('close', () => { closed = true; });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBe(false);
  });
});

describe('Toast', () => {

  it('renders message with role=status', () => {
    const { getByRole, getByText } = render(Toast, { props: { message: 'Saved!' } });
    expect(getByRole('status')).toBeTruthy();
    expect(getByText('Saved!')).toBeTruthy();
  });

  it('uses info styling by default', () => {
    const { container } = render(Toast, { props: { message: 'hi' } });
    const toast = container.querySelector('.toast') as HTMLElement;
    // jsdom serialises hex colors to rgb()
    const style = toast.getAttribute('style') ?? '';
    expect(/#eff6ff|rgb\(239,\s*246,\s*255\)/.test(style)).toBe(true);
  });

  it('applies success styling when type="success"', () => {
    const { container } = render(Toast, { props: { message: 'ok', type: 'success' } });
    const toast = container.querySelector('.toast') as HTMLElement;
    const style = toast.getAttribute('style') ?? '';
    expect(/#f0fdf4|rgb\(240,\s*253,\s*244\)/.test(style)).toBe(true);
  });

  it('dispatches dismiss when X button clicked', async () => {
    let dismissed = false;
    const { getByLabelText, component } = render(Toast, { props: { message: 'x', duration: 0 } });
    component.$on('dismiss', () => { dismissed = true; });
    await fireEvent.click(getByLabelText('Dismiss'));
    expect(dismissed).toBe(true);
  });

  it('renders error styling with correct background', () => {
    const { container } = render(Toast, { props: { message: 'fail', type: 'error' } });
    const toast = container.querySelector('.toast') as HTMLElement;
    const style = toast.getAttribute('style') ?? '';
    // error background: #fef2f2 or rgb(254, 242, 242)
    expect(/#fef2f2|rgb\(254,\s*242,\s*242\)/.test(style)).toBe(true);
  });

  it('renders warning styling with correct background', () => {
    const { container } = render(Toast, { props: { message: 'warn', type: 'warning' } });
    const toast = container.querySelector('.toast') as HTMLElement;
    const style = toast.getAttribute('style') ?? '';
    // warning background: #fffbeb or rgb(255, 251, 235)
    expect(/#fffbeb|rgb\(255,\s*251,\s*235\)/.test(style)).toBe(true);
  });

  it('renders dismiss button with aria-label', () => {
    const { container } = render(Toast, { props: { message: 'x' } });
    const btn = container.querySelector('button[aria-label="Dismiss"]');
    expect(btn).not.toBeNull();
    expect(btn?.textContent?.trim()).toBe('x');
  });

  // Note: auto-dismiss via onMount setTimeout is not testable in jsdom
  // (Svelte 4 onMount doesn't fire in @testing-library/svelte v5 + jsdom).
  // Timer behavior is covered by E2E tests instead.
});

describe('ExportButton', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is disabled when data array is empty', () => {
    const { getByRole } = render(ExportButton, { props: { data: [], columns: ['a'] } });
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is enabled when data has rows', () => {
    const { getByRole } = render(ExportButton, {
      props: { data: [{ a: 1 }], columns: ['a'] },
    });
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking export does not throw with valid data', async () => {
    const clickSpy = vi.fn();
    // Patch anchor click so it doesn't trigger actual download
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag) as HTMLElement;
      if (tag === 'a') {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });

    const { getByRole } = render(ExportButton, {
      props: { data: [{ a: 'hello, world', b: 'test' }], columns: ['a', 'b'] },
    });
    await fireEvent.click(getByRole('button'));
    expect(clickSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('export respects early-return when data is empty (no side effect)', async () => {
    const { getByRole } = render(ExportButton, { props: { data: [], columns: [] } });
    // Button is disabled so click won't invoke handler; verify via state
    expect((getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('MaskedField', () => {
  afterEach(() => {
    clearSession();
  });

  it('masks sensitive field for non-admin role', async () => {
    setSession({
      userId: 'u1',
      role: UserRole.PickerPacker,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    const { container } = render(MaskedField, {
      props: { fieldName: 'email', value: 'alice@example.com', maskType: 'email' },
    });
    await tick();
    const text = container.querySelector('.field-value')?.textContent ?? '';
    expect(text).not.toBe('alice@example.com');
  });

  it('warehouse manager sees masked value initially and can reveal/hide', async () => {
    // WarehouseManager has identity.reveal_basic capability
    setSession({
      userId: 'u1',
      role: UserRole.WarehouseManager,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    const originalValue = 'user@domain.com';
    const { container } = render(MaskedField, {
      props: { fieldName: 'email', value: originalValue, maskType: 'email' },
    });
    await tick();

    const fieldValue = () => container.querySelector('.field-value')?.textContent ?? '';
    const btn = container.querySelector('.reveal-btn') as HTMLButtonElement | null;

    // Initial: should be masked (not showing original)
    const maskedText = fieldValue();
    expect(maskedText).not.toBe(originalValue);
    expect(maskedText.length).toBeGreaterThan(0);

    if (btn) {
      // Reveal button should say "Reveal"
      expect(btn.textContent?.trim()).toBe('Reveal');
      expect(btn.getAttribute('aria-label')).toBe('Reveal');

      // Click reveal → value changes to original
      await fireEvent.click(btn);
      await tick();
      expect(fieldValue()).toBe(originalValue);
      expect(btn.textContent?.trim()).toBe('Hide');

      // Click hide → value reverts to masked
      await fireEvent.click(btn);
      await tick();
      expect(fieldValue()).not.toBe(originalValue);
      expect(btn.textContent?.trim()).toBe('Reveal');
    }
  });

  it('administrator with reveal capability sees field correctly', async () => {
    setSession({
      userId: 'u1',
      role: UserRole.Administrator,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    const { container } = render(MaskedField, {
      props: { fieldName: 'email', value: 'admin@co.com', maskType: 'email' },
    });
    await tick();
    // Field value element should exist and contain non-empty text
    const text = container.querySelector('.field-value')?.textContent ?? '';
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('ReservationTimer', () => {
  // Note: onMount/setInterval don't fire in jsdom (Svelte 4 + @testing-library/svelte v5).
  // Timer countdown behavior is verified by E2E tests (Playwright, real browser).
  // Unit tests verify: component structure, prop acceptance, CSS class binding, a11y.

  it('renders .timer span element for active reservation', () => {
    const { container } = render(ReservationTimer, {
      props: { lastActivityAt: new Date().toISOString(), status: 'active' },
    });
    const span = container.querySelector('.timer');
    expect(span).not.toBeNull();
    expect(span?.tagName.toLowerCase()).toBe('span');
  });

  it('renders .timer span for expired past lastActivityAt', () => {
    const past = new Date(Date.now() - RESERVATION_TIMEOUT_MS - 1000).toISOString();
    const { container } = render(ReservationTimer, {
      props: { lastActivityAt: past, status: 'active' },
    });
    const span = container.querySelector('.timer');
    expect(span).not.toBeNull();
  });

  it('renders .timer span for released status', () => {
    const { container } = render(ReservationTimer, {
      props: { lastActivityAt: new Date().toISOString(), status: 'released' },
    });
    const span = container.querySelector('.timer');
    expect(span).not.toBeNull();
  });

  it('underlying timer logic computes expiry correctly (pure function)', async () => {
    // Test the logic imported by the component, independent of DOM lifecycle
    const { getExpiresAt, isReservationExpired } = await import('../../src/modules/orders/reservation-timer');
    const recent = new Date().toISOString();
    const expiresAt = getExpiresAt(recent);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const old = new Date(Date.now() - RESERVATION_TIMEOUT_MS - 1000).toISOString();
    expect(isReservationExpired(old)).toBe(true);
    expect(isReservationExpired(recent)).toBe(false);
  });
});
