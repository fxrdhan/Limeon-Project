import { describe, expect, it } from 'vitest';
import * as agGridExports from './index';

describe('ag-grid index exports', () => {
  it('re-exports DataGrid setup and helper APIs', () => {
    expect(agGridExports.DataGrid).toBeTypeOf('object');

    expect(agGridExports.getDefaultGridConfig).toBeTypeOf('function');
    expect(agGridExports.defaultTheme).toBeDefined();
    expect(agGridExports.defaultColDef).toBeDefined();
    expect(agGridExports.getRowId).toBeTypeOf('function');
    expect(agGridExports.getContextMenuItems).toBeTypeOf('function');
    expect(agGridExports.localeText).toBeDefined();

    expect(agGridExports.createTextColumn).toBeTypeOf('function');
    expect(agGridExports.createWrapTextColumn).toBeTypeOf('function');
    expect(agGridExports.createNumberColumn).toBeTypeOf('function');
    expect(agGridExports.createCurrencyColumn).toBeTypeOf('function');
    expect(agGridExports.createCenterAlignColumn).toBeTypeOf('function');
    expect(agGridExports.createMatchScoreColumn).toBeTypeOf('function');

    expect(agGridExports.formatCurrency).toBeTypeOf('function');
    expect(agGridExports.formatBaseCurrency).toBeTypeOf('function');

    expect(agGridExports.COLUMN_MENU_TABS).toBeDefined();
    expect(agGridExports.MENU_PRESETS).toBeDefined();
    expect(agGridExports.getPinOnlyMenuItems).toBeTypeOf('function');
    expect(agGridExports.getPinAndFilterMenuItems).toBeTypeOf('function');
    expect(agGridExports.getSortOnlyMenuItems).toBeTypeOf('function');
    expect(agGridExports.getAutosizeOnlyMenuItems).toBeTypeOf('function');
    expect(agGridExports.getPinAndSortMenuItems).toBeTypeOf('function');
    expect(agGridExports.getPinAndAutosizeMenuItems).toBeTypeOf('function');
  });
});
