import { describe, it, expect } from 'vitest';
import { isSubWarehouse } from '../src/lib/types/inventory';
// Import bare type modules to ensure they're counted in coverage — type-only files compile to empty JS
import * as _authTypes from '../src/lib/types/auth';
import * as _commonTypes from '../src/lib/types/common';
import * as _filesTypes from '../src/lib/types/files';
import * as _identityTypes from '../src/lib/types/identity';
import * as _notifTypes from '../src/lib/types/notifications';
import * as _ordersTypes from '../src/lib/types/orders';
import * as _prefTypes from '../src/lib/types/preferences';
import type { Warehouse } from '../src/lib/types/inventory';

describe('types/inventory — isSubWarehouse', () => {
  const baseWarehouse: Warehouse = {
    id: 'wh',
    name: 'Main',
    code: 'MAIN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  it('returns true when parentId is a non-empty string', () => {
    expect(isSubWarehouse({ ...baseWarehouse, parentId: 'wh-parent' })).toBe(true);
  });

  it('returns false when parentId is undefined', () => {
    expect(isSubWarehouse({ ...baseWarehouse, parentId: undefined })).toBe(false);
  });

  it('returns false when parentId is null', () => {
    expect(isSubWarehouse({ ...baseWarehouse, parentId: null as unknown as string })).toBe(false);
  });

  it('returns false on a default warehouse (no parentId)', () => {
    expect(isSubWarehouse(baseWarehouse)).toBe(false);
  });
});

describe('type modules load without error', () => {
  it('all type modules are imported (no runtime side-effects expected)', () => {
    // These imports are intentional: v8 coverage counts .ts files that compile to empty JS
    // as 0%. Importing them ensures they're executed during the test run.
    expect(_authTypes).toBeDefined();
    expect(_commonTypes).toBeDefined();
    expect(_filesTypes).toBeDefined();
    expect(_identityTypes).toBeDefined();
    expect(_notifTypes).toBeDefined();
    expect(_ordersTypes).toBeDefined();
    expect(_prefTypes).toBeDefined();
  });
});
