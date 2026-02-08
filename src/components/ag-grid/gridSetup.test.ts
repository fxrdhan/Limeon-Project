import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerModulesMock = vi.hoisted(() => vi.fn());
const setLicenseKeyMock = vi.hoisted(() => vi.fn());
const withParamsMock = vi.hoisted(() =>
  vi.fn((params: Record<string, unknown>) => ({
    theme: 'mock-quartz',
    params,
  }))
);

vi.mock('ag-grid-community', () => ({
  AG_GRID_LOCALE_EN: { equals: '=', notEqual: '!=' },
  ModuleRegistry: {
    registerModules: registerModulesMock,
  },
  themeQuartz: {
    withParams: withParamsMock,
  },
  CellStyleModule: { name: 'CellStyleModule' },
  ClientSideRowModelModule: { name: 'ClientSideRowModelModule' },
  ColumnApiModule: { name: 'ColumnApiModule' },
  ColumnAutoSizeModule: { name: 'ColumnAutoSizeModule' },
  CsvExportModule: { name: 'CsvExportModule' },
  EventApiModule: { name: 'EventApiModule' },
  ExternalFilterModule: { name: 'ExternalFilterModule' },
  GridStateModule: { name: 'GridStateModule' },
  HighlightChangesModule: { name: 'HighlightChangesModule' },
  LocaleModule: { name: 'LocaleModule' },
  NumberFilterModule: { name: 'NumberFilterModule' },
  PaginationModule: { name: 'PaginationModule' },
  RowApiModule: { name: 'RowApiModule' },
  RowStyleModule: { name: 'RowStyleModule' },
  TextEditorModule: { name: 'TextEditorModule' },
  TextFilterModule: { name: 'TextFilterModule' },
  TooltipModule: { name: 'TooltipModule' },
  ValidationModule: { name: 'ValidationModule' },
}));

vi.mock('ag-grid-enterprise', () => ({
  LicenseManager: {
    setLicenseKey: setLicenseKeyMock,
  },
  AdvancedFilterModule: { name: 'AdvancedFilterModule' },
  CellSelectionModule: { name: 'CellSelectionModule' },
  ClipboardModule: { name: 'ClipboardModule' },
  ColumnsToolPanelModule: { name: 'ColumnsToolPanelModule' },
  ExcelExportModule: { name: 'ExcelExportModule' },
  FiltersToolPanelModule: { name: 'FiltersToolPanelModule' },
  MenuModule: { name: 'MenuModule' },
  MultiFilterModule: { name: 'MultiFilterModule' },
  NewFiltersToolPanelModule: { name: 'NewFiltersToolPanelModule' },
  RowGroupingModule: { name: 'RowGroupingModule' },
  RowGroupingPanelModule: { name: 'RowGroupingPanelModule' },
  RowNumbersModule: { name: 'RowNumbersModule' },
  RowSelectionModule: { name: 'RowSelectionModule' },
  SetFilterModule: { name: 'SetFilterModule' },
}));

describe('gridSetup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    registerModulesMock.mockReset();
    setLicenseKeyMock.mockReset();
    withParamsMock.mockClear();
  });

  it('registers modules and applies license when env key is present', async () => {
    vi.stubEnv('VITE_AG_GRID_LICENSE_KEY', 'license-123');

    const module = await import('./gridSetup');

    expect(registerModulesMock).toHaveBeenCalled();
    expect(setLicenseKeyMock).toHaveBeenCalledWith('license-123');

    const config = module.getDefaultGridConfig();
    expect(config).toMatchObject({
      rowHeight: 32,
      suppressScrollOnNewData: true,
      maintainColumnOrder: true,
      loadThemeGoogleFonts: false,
    });
    expect(config.localeText).toBeTypeOf('object');
    expect(config.localeText).toHaveProperty('equals');

    expect(module.getContextMenuItems({} as never)).toEqual([
      'copy',
      'copyWithHeaders',
      'copyWithGroupHeaders',
    ]);

    expect(module.getRowId({ data: { id: 'a' } } as never)).toBe('a');
    expect(module.getRowId({ data: { kode: 'b' } } as never)).toBe('b');
    expect(module.getRowId({ data: { code: 'c' } } as never)).toBe('c');
  });

  it('warns when license key is missing and still configures defaults', async () => {
    vi.stubEnv('VITE_AG_GRID_LICENSE_KEY', '');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const module = await import('./gridSetup');

    expect(setLicenseKeyMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('AG Grid Enterprise license key not found')
    );

    expect(module.defaultColDef.sortable).toBe(true);
    expect(module.defaultColDef.resizable).toBe(true);
    expect(withParamsMock).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
