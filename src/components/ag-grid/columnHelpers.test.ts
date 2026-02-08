import { describe, expect, it } from 'vitest';
import {
  COLUMN_MENU_TABS,
  MENU_PRESETS,
  createCenterAlignColumn,
  createCurrencyColumn,
  createMatchScoreColumn,
  createNumberColumn,
  createTextColumn,
  createWrapTextColumn,
  formatBaseCurrency,
  formatCurrency,
  getAutosizeOnlyMenuItems,
  getPinAndAutosizeMenuItems,
  getPinAndFilterMenuItems,
  getPinAndSortMenuItems,
  getPinOnlyMenuItems,
  getSortOnlyMenuItems,
} from './columnHelpers';

describe('columnHelpers', () => {
  it('creates text/wrap/number/center columns with expected defaults', () => {
    const text = createTextColumn({ field: 'name', headerName: 'Nama' });
    expect(text).toMatchObject({ field: 'name', headerName: 'Nama' });
    expect(text.cellStyle).toMatchObject({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });

    const wrap = createWrapTextColumn({ field: 'desc', headerName: 'Desc' });
    expect(wrap.cellStyle).toMatchObject({
      overflow: 'visible',
      textOverflow: 'unset',
      whiteSpace: 'normal',
    });

    const number = createNumberColumn({ field: 'qty', headerName: 'Qty' });
    expect(number.cellStyle).toMatchObject({ textAlign: 'right' });

    const center = createCenterAlignColumn({
      field: 'code',
      headerName: 'Code',
    });
    expect(center.cellStyle).toMatchObject({ textAlign: 'center' });
  });

  it('creates currency columns and supports custom formatter', () => {
    const currency = createCurrencyColumn({
      field: 'price',
      headerName: 'Harga',
    });

    const defaultFormatted = currency.valueFormatter?.({
      value: 1000,
    } as never);
    expect(defaultFormatted).toContain('Rp');

    const custom = createCurrencyColumn({
      field: 'custom',
      headerName: 'Custom',
      valueFormatter: () => 'CUSTOM',
      valueGetter: () => 999,
      sortable: false,
      resizable: false,
    });

    expect(custom.valueFormatter?.({ value: 1 } as never)).toBe('CUSTOM');
    expect(custom.valueGetter).toBeTypeOf('function');
    expect(custom.sortable).toBe(false);
    expect(custom.resizable).toBe(false);

    expect(formatCurrency(1200)).toContain('Rp');
    expect(formatBaseCurrency(1200)).toContain('Rp');
  });

  it('creates match score column and calls score getter', () => {
    const col = createMatchScoreColumn({
      headerName: 'Match',
      minWidth: 120,
      getMatchScore: data => (data as { score: number }).score,
    });

    const value = col.valueGetter?.({ data: { score: 88 } } as never);
    expect(col.field).toBe('matchScore');
    expect(col.sort).toBe('desc');
    expect(col.filter).toBe(false);
    expect(value).toBe(88);
  });

  it('returns expected menu tab presets and menu item helpers', () => {
    expect(COLUMN_MENU_TABS).toMatchObject({
      FILTER: 'filterMenuTab',
      GENERAL: 'generalMenuTab',
      COLUMNS: 'columnsMenuTab',
    });

    expect(MENU_PRESETS.ALL).toEqual([
      'filterMenuTab',
      'generalMenuTab',
      'columnsMenuTab',
    ]);
    expect(MENU_PRESETS.BASIC).toEqual(['filterMenuTab', 'generalMenuTab']);
    expect(MENU_PRESETS.SORT_ONLY).toEqual(['generalMenuTab']);
    expect(MENU_PRESETS.FILTER_ONLY).toEqual(['filterMenuTab']);
    expect(MENU_PRESETS.COLUMNS_ONLY).toEqual(['columnsMenuTab']);
    expect(MENU_PRESETS.NONE).toEqual([]);

    expect(getPinOnlyMenuItems({} as never)).toEqual(['pinSubMenu']);
    expect(getSortOnlyMenuItems({} as never)).toEqual([
      'sortAscending',
      'sortDescending',
    ]);
    expect(getAutosizeOnlyMenuItems({} as never)).toEqual([
      'autoSizeThis',
      'autoSizeAll',
    ]);
    expect(getPinAndSortMenuItems({} as never)).toEqual([
      'pinSubMenu',
      'separator',
      'sortAscending',
      'sortDescending',
    ]);
    expect(getPinAndAutosizeMenuItems({} as never)).toEqual([
      'pinSubMenu',
      'separator',
      'autoSizeThis',
      'autoSizeAll',
    ]);
  });

  it('returns pin+filter menu and conditionally adds rowGroup', () => {
    const base = getPinAndFilterMenuItems({
      column: {
        getColDef: () => ({}),
      },
    } as never);

    expect(base).toEqual([
      'sortAscending',
      'sortDescending',
      'separator',
      'columnFilter',
      'separator',
      'pinSubMenu',
    ]);

    const withGroup = getPinAndFilterMenuItems({
      column: {
        getColDef: () => ({ enableRowGroup: true }),
      },
    } as never);

    expect(withGroup).toEqual([
      'sortAscending',
      'sortDescending',
      'separator',
      'columnFilter',
      'separator',
      'pinSubMenu',
      'separator',
      'rowGroup',
    ]);
  });
});
