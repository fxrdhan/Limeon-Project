import { describe, expect, it } from 'vite-plus/test';
import { hasInitialColumnSizing } from './gridState';

describe('ag-grid state helpers', () => {
  it('detects persisted column sizing models', () => {
    expect(
      hasInitialColumnSizing({
        columnSizing: {
          columnSizingModel: [
            {
              colId: 'name',
              width: 180,
            },
          ],
        },
      })
    ).toBe(true);
  });

  it('ignores missing, empty, and malformed column sizing state', () => {
    expect(hasInitialColumnSizing(undefined)).toBe(false);
    expect(hasInitialColumnSizing(true)).toBe(false);
    expect(hasInitialColumnSizing([])).toBe(false);
    expect(
      hasInitialColumnSizing({
        columnSizing: {
          columnSizingModel: [],
        },
      })
    ).toBe(false);
    expect(
      hasInitialColumnSizing({
        columnSizing: {
          columnSizingModel: 'name',
        },
      })
    ).toBe(false);
  });
});
