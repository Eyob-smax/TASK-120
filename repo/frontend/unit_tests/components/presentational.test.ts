import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import LoadingSpinner from '../../src/components/LoadingSpinner.svelte';
import EmptyState from '../../src/components/EmptyState.svelte';
import ProgressBar from '../../src/components/ProgressBar.svelte';
import PageHeader from '../../src/components/PageHeader.svelte';
import ErrorBanner from '../../src/components/ErrorBanner.svelte';
import AlertBanner from '../../src/components/AlertBanner.svelte';
import FilterChip from '../../src/components/FilterChip.svelte';
import NotFound from '../../src/routes/NotFound.svelte';
import type { SafetyStockAlert } from '../../src/lib/types/inventory';

describe('Presentational Components', () => {
  describe('LoadingSpinner', () => {
    it('renders the default message with role=status', () => {
      const { getByRole, getByText } = render(LoadingSpinner);
      expect(getByRole('status')).toBeTruthy();
      expect(getByText('Loading...')).toBeTruthy();
    });

    it('renders a custom message', () => {
      const { getByText } = render(LoadingSpinner, { props: { message: 'Fetching data' } });
      expect(getByText('Fetching data')).toBeTruthy();
    });

    it('hides paragraph when message is empty', () => {
      const { container } = render(LoadingSpinner, { props: { message: '' } });
      expect(container.querySelector('p')).toBeNull();
    });
  });

  describe('EmptyState', () => {
    it('renders the default message', () => {
      const { getByText } = render(EmptyState);
      expect(getByText('No data available')).toBeTruthy();
    });

    it('hides action button when actionLabel is empty', () => {
      const { container } = render(EmptyState, { props: { message: 'nothing here' } });
      expect(container.querySelector('button')).toBeNull();
    });

    it('renders action button when actionLabel is set', () => {
      const { getByRole } = render(EmptyState, { props: { message: 'x', actionLabel: 'Add new' } });
      expect(getByRole('button')).toBeTruthy();
    });
  });

  describe('ProgressBar', () => {
    it('renders 0% when value is 0', () => {
      const { getByText } = render(ProgressBar, { props: { value: 0, max: 100 } });
      expect(getByText('0%')).toBeTruthy();
    });

    it('computes 50% for value=50, max=100', () => {
      const { getByText } = render(ProgressBar, { props: { value: 50, max: 100 } });
      expect(getByText('50%')).toBeTruthy();
    });

    it('shows 0% when max is 0 (avoid NaN)', () => {
      const { getByText } = render(ProgressBar, { props: { value: 0, max: 0 } });
      expect(getByText('0%')).toBeTruthy();
    });

    it('renders label when provided', () => {
      const { getByText } = render(ProgressBar, { props: { label: 'Upload', value: 10, max: 100 } });
      expect(getByText('Upload')).toBeTruthy();
    });

    it('role=progressbar has aria-valuenow attribute', () => {
      const { getByRole } = render(ProgressBar, { props: { value: 25, max: 100 } });
      const bar = getByRole('progressbar');
      expect(bar.getAttribute('aria-valuenow')).toBe('25');
    });
  });

  describe('PageHeader', () => {
    it('renders the title', () => {
      const { getByText } = render(PageHeader, { props: { title: 'My Page' } });
      expect(getByText('My Page')).toBeTruthy();
    });
  });

  describe('ErrorBanner', () => {
    it('renders message with role=alert', () => {
      const { getByRole } = render(ErrorBanner, { props: { message: 'Oops!' } });
      expect(getByRole('alert').textContent).toContain('Oops!');
    });

    it('hides dismiss button when onDismiss is undefined', () => {
      const { container } = render(ErrorBanner, { props: { message: 'x' } });
      expect(container.querySelector('button')).toBeNull();
    });

    it('invokes onDismiss when dismiss button clicked', async () => {
      let called = false;
      const onDismiss = () => { called = true; };
      const { getByLabelText } = render(ErrorBanner, { props: { message: 'x', onDismiss } });
      await fireEvent.click(getByLabelText('Dismiss error'));
      expect(called).toBe(true);
    });
  });

  describe('AlertBanner', () => {
    const mkAlert = (id: string): SafetyStockAlert => ({
      warehouseId: 'wh-1',
      skuId: id,
      currentStock: 1,
      threshold: 10,
      triggeredAt: new Date().toISOString(),
    });

    it('renders nothing when alerts are empty', () => {
      const { container } = render(AlertBanner, { props: { alerts: [] } });
      expect(container.querySelector('[role="alert"]')).toBeNull();
    });

    it('renders alert count in header', () => {
      const { getByText } = render(AlertBanner, { props: { alerts: [mkAlert('a'), mkAlert('b')] } });
      expect(getByText(/Low Stock Alert \(2\)/)).toBeTruthy();
    });

    it('shows up to 5 alerts and "more" overflow line for extras', () => {
      const alerts = Array.from({ length: 7 }, (_, i) => mkAlert(`sku-${i}`));
      const { getByText, container } = render(AlertBanner, { props: { alerts } });
      expect(container.querySelectorAll('li').length).toBe(6); // 5 alerts + 1 "...and 2 more"
      expect(getByText(/and 2 more/)).toBeTruthy();
    });

    it('renders dismiss button when onDismiss provided', () => {
      const { getByLabelText } = render(AlertBanner, { props: { alerts: [mkAlert('a')], onDismiss: () => {} } });
      expect(getByLabelText('Dismiss')).toBeTruthy();
    });
  });

  describe('FilterChip', () => {
    it('renders label only when value is empty', () => {
      const { getByText } = render(FilterChip, { props: { label: 'Status' } });
      expect(getByText('Status')).toBeTruthy();
    });

    it('renders "label: value" when value provided', () => {
      const { getByText } = render(FilterChip, { props: { label: 'Zone', value: 'A1' } });
      expect(getByText('Zone: A1')).toBeTruthy();
    });

    it('dispatches remove event when X button clicked', async () => {
      let removed = false;
      const { getByLabelText, component } = render(FilterChip, { props: { label: 'Zone', value: 'A1' } });
      component.$on('remove', () => { removed = true; });
      await fireEvent.click(getByLabelText('Remove filter Zone'));
      expect(removed).toBe(true);
    });
  });

  describe('NotFound route', () => {
    it('renders 404 heading and dashboard link', () => {
      const { getByText } = render(NotFound);
      expect(getByText('404')).toBeTruthy();
      expect(getByText('Return to Dashboard')).toBeTruthy();
    });
  });
});
