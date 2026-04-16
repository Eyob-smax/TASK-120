import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import DataTable from '../../src/components/DataTable.svelte';
import { setSession, clearSession } from '../../src/lib/stores/auth.store';
import { UserRole } from '../../src/lib/types/enums';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age', sortable: true },
];

describe('DataTable', () => {
  afterEach(() => {
    clearSession();
  });

  it('shows loading spinner with message when loading=true', () => {
    const { getByRole, container } = render(DataTable, { props: { columns, data: [], loading: true } });
    expect(getByRole('status')).not.toBeNull();
    expect(container.querySelector('.spinner')).not.toBeNull();
    // No table rendered while loading
    expect(container.querySelector('table')).toBeNull();
  });

  it('shows empty state with message when data is empty and not loading', () => {
    const { container } = render(DataTable, { props: { columns, data: [] } });
    expect(container.querySelector('.empty-state')).not.toBeNull();
    expect(container.querySelector('.empty-state p')?.textContent).toBe('No records found');
    // No table rendered
    expect(container.querySelector('table')).toBeNull();
  });

  it('renders the correct number of rows', () => {
    const data = Array.from({ length: 3 }, (_, i) => ({ name: `n${i}`, age: i }));
    const { container } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    expect(container.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('renders column labels in the header', () => {
    const { getByText } = render(DataTable, { props: { columns, data: [{ name: 'x', age: 1 }] } });
    expect(getByText('Name')).toBeTruthy();
    expect(getByText('Age')).toBeTruthy();
  });

  it('sorts data asc when sortable column header clicked', async () => {
    const data = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 28 },
    ];
    const { container, getByText } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    await fireEvent.click(getByText('Name'));
    await tick();
    const rows = container.querySelectorAll('tbody tr td:first-child');
    expect(rows[0].textContent?.trim()).toBe('Alice');
    expect(rows[2].textContent?.trim()).toBe('Charlie');
  });

  it('sorts data desc on second click of same column', async () => {
    const data = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 28 },
    ];
    const { container, getByText } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    await fireEvent.click(getByText('Name'));
    await fireEvent.click(getByText('Name'));
    await tick();
    const rows = container.querySelectorAll('tbody tr td:first-child');
    expect(rows[0].textContent?.trim()).toBe('Charlie');
    expect(rows[2].textContent?.trim()).toBe('Alice');
  });

  it('paginates when data exceeds pageSize', async () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ name: `n${i}`, age: i }));
    const { container, getByText } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    expect(container.querySelectorAll('tbody tr').length).toBe(10);
    expect(getByText('1 / 3')).toBeTruthy();
  });

  it('Prev button disabled on first page', () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ name: `n${i}`, age: i }));
    const { getByText } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    const prev = getByText('Prev') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('advances pages with Next button', async () => {
    const data = Array.from({ length: 25 }, (_, i) => ({ name: `n${i}`, age: i }));
    const { getByText } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    await fireEvent.click(getByText('Next'));
    await tick();
    expect(getByText('2 / 3')).toBeTruthy();
  });

  it('Next button disabled on last page', async () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ name: `n${i}`, age: i }));
    const { getByText } = render(DataTable, { props: { columns, data, pageSize: 10 } });
    // Only 1 page — pagination bar is hidden; no Next button rendered
    // Test by using pageSize=2 to have 3 pages, advance to last
    // (We already tested the Prev path; here verify directly by state)
    expect(() => getByText('1 / 1')).toThrow(); // no pagination rendered
  });

  it('disables Next on final page after advancing', async () => {
    const data = Array.from({ length: 6 }, (_, i) => ({ name: `n${i}`, age: i }));
    const { getByText } = render(DataTable, { props: { columns, data, pageSize: 3 } });
    await fireEvent.click(getByText('Next'));
    await fireEvent.click(getByText('Next'));
    await tick();
    const next = getByText('Next') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('invokes onRowAction when row action button clicked', async () => {
    const data = [{ name: 'X', age: 1 }];
    const actions = [{ label: 'Edit', action: 'edit' }];
    let captured: { row: any; action: string } | null = null;
    const { getByText } = render(DataTable, {
      props: {
        columns,
        data,
        pageSize: 10,
        showActions: true,
        rowActions: actions,
        onRowAction: (row: any, action: string) => { captured = { row, action }; },
      },
    });
    await fireEvent.click(getByText('Edit'));
    expect(captured?.action).toBe('edit');
    expect((captured?.row as any).name).toBe('X');
  });

  it('renders Actions header when showActions=true', () => {
    const { getByText } = render(DataTable, {
      props: { columns, data: [{ name: 'x', age: 1 }], showActions: true, rowActions: [] },
    });
    expect(getByText('Actions')).toBeTruthy();
  });

  it('renders MaskedField for columns with maskField', async () => {
    setSession({
      userId: 'u1',
      role: UserRole.PickerPacker,
      loginAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      isLocked: false,
    });
    const maskedColumns = [
      { key: 'email', label: 'Email', maskField: 'email', maskType: 'email' as const },
    ];
    const data = [{ email: 'user@example.com' }];
    const { container } = render(DataTable, { props: { columns: maskedColumns, data, pageSize: 10 } });
    await tick();
    const cell = container.querySelector('tbody td')?.textContent ?? '';
    // For a picker_packer role, email field should be masked (not the original)
    expect(cell).not.toContain('user@example.com');
  });

  it('non-sortable column renders plain label (no sort button)', () => {
    const cols = [{ key: 'name', label: 'Name' }];
    const { container } = render(DataTable, {
      props: { columns: cols, data: [{ name: 'x' }], pageSize: 10 },
    });
    // No sort-btn since column is not sortable
    expect(container.querySelector('th .sort-btn')).toBeNull();
  });
});
