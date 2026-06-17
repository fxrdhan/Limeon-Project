import { act, renderHook, waitFor } from '@testing-library/react';
import type { GridApi } from 'ag-grid-community';
import { StrictMode, type ReactNode } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useGoogleSheetsExport } from './useGoogleSheetsExport';

const { mockGoogleSheetsService, mockOpenConfirmDialog, mockProcessGridData } =
  vi.hoisted(() => ({
    mockGoogleSheetsService: {
      authorize: vi.fn(),
      exportGridDataToSheets: vi.fn(),
      initialize: vi.fn(),
      isAuthorized: vi.fn(),
      isInitialized: vi.fn(),
    },
    mockOpenConfirmDialog: vi.fn(),
    mockProcessGridData: vi.fn(),
  }));

vi.mock('@/components/dialog-box/useConfirmDialog', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: mockOpenConfirmDialog,
  }),
}));

vi.mock('@/utils/googleSheetsApi', () => ({
  googleSheetsService: mockGoogleSheetsService,
}));

vi.mock('./googleSheetsData', () => ({
  processGridDataForGoogleSheets: mockProcessGridData,
}));

const gridApi: GridApi = Object.assign(Object.create(null), {
  isDestroyed: vi.fn(() => false),
});

const createPlaceholderTab = () => {
  const tab = Object.create(window) as Window;
  const write = vi.fn();
  const close = vi.fn();
  const location = { href: '' };

  Object.defineProperty(tab, 'closed', {
    configurable: true,
    value: false,
  });
  Object.defineProperty(tab, 'close', {
    configurable: true,
    value: close,
  });
  Object.defineProperty(tab, 'document', {
    configurable: true,
    value: { write },
  });
  Object.defineProperty(tab, 'location', {
    configurable: true,
    value: location,
  });

  return { close, tab, write };
};

const createDeferred = <T,>() => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      resolvePromise?.(value);
    },
  };
};

const StrictWrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe('useGoogleSheetsExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGoogleSheetsService.initialize.mockResolvedValue(undefined);
    mockGoogleSheetsService.authorize.mockResolvedValue(undefined);
    mockGoogleSheetsService.isInitialized.mockReturnValue(true);
    mockGoogleSheetsService.isAuthorized.mockReturnValue(true);
    mockProcessGridData.mockResolvedValue({
      headers: ['Name'],
      processedData: [['Apotek']],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the app confirm dialog to retry when Google auth expires during export', async () => {
    const placeholderTab = createPlaceholderTab();
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue(placeholderTab.tab);
    const closeDropdown = vi.fn();

    mockGoogleSheetsService.exportGridDataToSheets.mockRejectedValue(
      new Error('Authentication token expired')
    );

    const { result } = renderHook(() =>
      useGoogleSheetsExport({
        closeDropdown,
        filename: 'items',
        gridApi,
        isOpen: true,
      })
    );

    await act(async () => {
      await result.current.handleGoogleSheetsExport();
    });

    await waitFor(() => {
      expect(mockOpenConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmText: 'Re-authenticate',
          title: 'Google Authentication Expired',
        })
      );
    });

    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(placeholderTab.close).toHaveBeenCalledOnce();
    expect(closeDropdown).not.toHaveBeenCalled();

    const confirmOptions = mockOpenConfirmDialog.mock.calls[0]?.[0];
    expect(confirmOptions).toBeDefined();

    act(() => {
      confirmOptions.onConfirm();
    });

    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it('ignores duplicate export requests while a Google Sheets export is running', async () => {
    const placeholderTab = createPlaceholderTab();
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue(placeholderTab.tab);
    const closeDropdown = vi.fn();
    const processedData = createDeferred<{
      headers: string[];
      processedData: string[][];
    }>();

    mockProcessGridData.mockReturnValue(processedData.promise);
    mockGoogleSheetsService.exportGridDataToSheets.mockResolvedValue(
      'https://docs.google.com/spreadsheets/d/sheet-1'
    );

    const { result } = renderHook(() =>
      useGoogleSheetsExport({
        closeDropdown,
        filename: 'items',
        gridApi,
        isOpen: true,
      })
    );

    await act(async () => {
      void result.current.handleGoogleSheetsExport();
      void result.current.handleGoogleSheetsExport();
      await Promise.resolve();
    });

    expect(openSpy).toHaveBeenCalledOnce();
    expect(mockProcessGridData).toHaveBeenCalledOnce();

    await act(async () => {
      processedData.resolve({
        headers: ['Name'],
        processedData: [['Apotek']],
      });
      await processedData.promise;
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        mockGoogleSheetsService.exportGridDataToSheets
      ).toHaveBeenCalledOnce();
    });
    expect(placeholderTab.tab.location.href).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-1'
    );
    expect(closeDropdown).toHaveBeenCalledOnce();
  });

  it('finishes a Google Sheets export after StrictMode effect replay', async () => {
    const placeholderTab = createPlaceholderTab();
    vi.spyOn(window, 'open').mockReturnValue(placeholderTab.tab);
    const closeDropdown = vi.fn();

    mockGoogleSheetsService.exportGridDataToSheets.mockResolvedValue(
      'https://docs.google.com/spreadsheets/d/sheet-1'
    );

    const { result } = renderHook(
      () =>
        useGoogleSheetsExport({
          closeDropdown,
          filename: 'items',
          gridApi,
          isOpen: true,
        }),
      { wrapper: StrictWrapper }
    );

    await act(async () => {
      await result.current.handleGoogleSheetsExport();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        mockGoogleSheetsService.exportGridDataToSheets
      ).toHaveBeenCalledOnce();
    });
    expect(placeholderTab.tab.location.href).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-1'
    );
    expect(closeDropdown).toHaveBeenCalledOnce();
  });

  it('closes the placeholder tab and skips dropdown updates after unmount', async () => {
    const placeholderTab = createPlaceholderTab();
    vi.spyOn(window, 'open').mockReturnValue(placeholderTab.tab);
    const closeDropdown = vi.fn();
    const processedData = createDeferred<{
      headers: string[];
      processedData: string[][];
    }>();

    mockProcessGridData.mockReturnValue(processedData.promise);
    mockGoogleSheetsService.exportGridDataToSheets.mockResolvedValue(
      'https://docs.google.com/spreadsheets/d/sheet-1'
    );

    const { result, unmount } = renderHook(() =>
      useGoogleSheetsExport({
        closeDropdown,
        filename: 'items',
        gridApi,
        isOpen: true,
      })
    );

    await act(async () => {
      void result.current.handleGoogleSheetsExport();
      await Promise.resolve();
    });

    unmount();

    await act(async () => {
      processedData.resolve({
        headers: ['Name'],
        processedData: [['Apotek']],
      });
      await processedData.promise;
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        mockGoogleSheetsService.exportGridDataToSheets
      ).toHaveBeenCalledOnce();
    });
    expect(placeholderTab.close).toHaveBeenCalledOnce();
    expect(closeDropdown).not.toHaveBeenCalled();
    expect(placeholderTab.tab.location.href).toBe('');
  });

  it('closes the placeholder tab if the grid is destroyed before export processing starts', async () => {
    const placeholderTab = createPlaceholderTab();
    vi.spyOn(window, 'open').mockReturnValue(placeholderTab.tab);
    const closeDropdown = vi.fn();
    const destroyedDuringExportGridApi: GridApi = Object.assign(
      Object.create(null),
      {
        isDestroyed: vi.fn().mockReturnValueOnce(false).mockReturnValue(true),
      }
    );

    const { result } = renderHook(() =>
      useGoogleSheetsExport({
        closeDropdown,
        filename: 'items',
        gridApi: destroyedDuringExportGridApi,
        isOpen: true,
      })
    );

    await act(async () => {
      await result.current.handleGoogleSheetsExport();
      await Promise.resolve();
    });

    expect(placeholderTab.close).toHaveBeenCalledOnce();
    expect(mockProcessGridData).not.toHaveBeenCalled();
    expect(
      mockGoogleSheetsService.exportGridDataToSheets
    ).not.toHaveBeenCalled();
    expect(closeDropdown).not.toHaveBeenCalled();
  });
});
