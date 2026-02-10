import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HTMLAttributes, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExportDropdown from './ExportDropdown';

const initializeMock = vi.hoisted(() => vi.fn());
const isAuthorizedMock = vi.hoisted(() => vi.fn());
const authorizeMock = vi.hoisted(() => vi.fn());
const exportGridDataToSheetsMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/googleSheetsApi', () => ({
  googleSheetsService: {
    initialize: initializeMock,
    isAuthorized: isAuthorizedMock,
    authorize: authorizeMock,
    exportGridDataToSheets: exportGridDataToSheetsMock,
  },
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

const createGridApi = (overrides: Record<string, unknown> = {}) => {
  const rows = [
    {
      name: 'Paracetamol',
      qty: 2,
      manufacturer: { name: 'Acme Pharma' },
    },
    {
      name: 'Amoxicillin',
      qty: 3,
      manufacturer: { name: 'Zen Labs' },
    },
  ];

  return {
    isDestroyed: vi.fn(() => false),
    exportDataAsCsv: vi.fn(),
    exportDataAsExcel: vi.fn(),
    forEachNodeAfterFilterAndSort: vi.fn(callback => {
      rows.forEach(data => callback({ data }));
    }),
    getColumnDefs: vi.fn(() => [
      { field: 'name', headerName: 'Name' },
      { field: 'manufacturer.name', headerName: 'Manufacturer' },
      {
        field: 'computed',
        headerName: 'Computed',
        valueGetter: ({ data }: { data: { qty: number } }) => data.qty * 2,
      },
      { field: 'internal', hide: true },
    ]),
    forEachNode: vi.fn(callback => {
      rows.forEach((data, index) =>
        callback({
          data,
          id: String(index),
          group: false,
        })
      );
    }),
    getColumn: vi.fn(() => null),
    ...overrides,
  };
};

describe('ExportDropdown', () => {
  beforeEach(() => {
    initializeMock.mockReset();
    isAuthorizedMock.mockReset();
    authorizeMock.mockReset();
    exportGridDataToSheetsMock.mockReset();

    initializeMock.mockResolvedValue(undefined);
    isAuthorizedMock.mockReturnValue(false);
    authorizeMock.mockResolvedValue('token');
    exportGridDataToSheetsMock.mockResolvedValue(
      'https://docs.google.com/spreadsheets/d/test-sheet'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports CSV, Excel, and JSON from dropdown actions', async () => {
    const user = userEvent.setup();
    const gridApi = createGridApi();

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const linkClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    render(<ExportDropdown gridApi={gridApi as never} filename="inventory" />);

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke CSV'));

    expect(gridApi.exportDataAsCsv).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: expect.stringContaining('inventory-'),
      })
    );

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Excel'));

    expect(gridApi.exportDataAsExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: expect.stringContaining('inventory-'),
        sheetName: 'Data',
      })
    );

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke JSON'));

    expect(gridApi.forEachNodeAfterFilterAndSort).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(linkClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('exports to Google Sheets with authorized session', async () => {
    const user = userEvent.setup();
    const gridApi = createGridApi();

    isAuthorizedMock.mockReturnValue(true);

    const placeholderTab = {
      document: { write: vi.fn() },
      location: { href: '' },
      close: vi.fn(),
      closed: false,
    };

    vi.spyOn(window, 'open').mockReturnValue(placeholderTab as never);

    render(
      <ExportDropdown gridApi={gridApi as never} filename="stock-report" />
    );

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Google Sheets'));

    await waitFor(() => {
      expect(initializeMock).toHaveBeenCalledTimes(1);
      expect(exportGridDataToSheetsMock).toHaveBeenCalledWith(
        [
          ['Paracetamol', 'Acme Pharma', '4'],
          ['Amoxicillin', 'Zen Labs', '6'],
        ],
        ['Name', 'Manufacturer', 'Computed'],
        'stock-report'
      );
      expect(placeholderTab.location.href).toBe(
        'https://docs.google.com/spreadsheets/d/test-sheet'
      );
    });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows alert when popup is blocked during Google export', async () => {
    const user = userEvent.setup();
    const gridApi = createGridApi();

    isAuthorizedMock.mockReturnValue(true);

    vi.spyOn(window, 'open').mockReturnValue(null);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ExportDropdown gridApi={gridApi as never} />);

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Google Sheets'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Please allow popups to open Google Sheets.'
      );
    });

    expect(exportGridDataToSheetsMock).not.toHaveBeenCalled();
  });

  it('handles authentication failure and closes on outside click', async () => {
    const user = userEvent.setup();
    const gridApi = createGridApi();

    isAuthorizedMock.mockReturnValue(false);
    authorizeMock.mockRejectedValue(new Error('auth failed'));

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ExportDropdown gridApi={gridApi as never} />);

    await user.click(screen.getByTitle('Export Data'));

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Google Sheets'));

    await waitFor(() => {
      expect(authorizeMock).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'Authentication failed. Please allow popups and try again.'
      );
    });
  });

  it('does not open menu when gridApi is null or destroyed', async () => {
    const user = userEvent.setup();

    const { rerender } = render(<ExportDropdown gridApi={null} />);
    await user.click(screen.getByTitle('Export Data'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    const destroyedApi = createGridApi({
      isDestroyed: vi.fn(() => true),
    });
    rerender(<ExportDropdown gridApi={destroyedApi as never} />);
    await user.click(screen.getByTitle('Export Data'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('toggles menu and exercises CSV/Excel formatter callbacks', async () => {
    const user = userEvent.setup();
    const gridApi = createGridApi();

    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      value: 300,
      configurable: true,
    });

    render(<ExportDropdown gridApi={gridApi as never} filename="report" />);

    const toggle = screen.getByTitle('Export Data');
    const getRectSpy = vi
      .spyOn(toggle, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 32,
        height: 32,
        top: 10,
        right: 500,
        bottom: 42,
        left: 468,
        toJSON: () => ({}),
      } as DOMRect);

    await user.click(toggle);
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveStyle({ left: '62px', width: '230px' });

    await user.click(toggle);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    Object.defineProperty(window, 'innerWidth', {
      value: 400,
      configurable: true,
    });
    getRectSpy.mockReturnValue({
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      top: 10,
      right: 100,
      bottom: 42,
      left: 68,
      toJSON: () => ({}),
    } as DOMRect);

    await user.click(toggle);
    expect(await screen.findByRole('menu')).toHaveStyle({ left: '8px' });

    await user.click(screen.getByText('Export ke CSV'));
    const csvParams = (gridApi.exportDataAsCsv as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(csvParams.processCellCallback({ value: null })).toBe('');
    expect(csvParams.processCellCallback({ value: undefined })).toBe('');
    expect(csvParams.processCellCallback({ value: 'ok' })).toBe('ok');

    await user.click(toggle);
    await user.click(screen.getByText('Export ke Excel'));
    const excelParams = (gridApi.exportDataAsExcel as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];

    expect(
      excelParams.columnWidth({
        column: { getColDef: () => ({ headerName: 'AB' }) },
      })
    ).toBe(80);
    expect(
      excelParams.columnWidth({
        column: { getColDef: () => ({ headerName: 'LongHeaderName' }) },
      })
    ).toBe(112);

    expect(
      excelParams.processCellCallback({
        value: null,
      })
    ).toBe('');
    expect(
      excelParams.processHeaderCallback({
        column: {
          getColDef: () => ({ headerName: '' }),
          getColId: () => 'fallback-id',
        },
      })
    ).toBe('fallback-id');

    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      configurable: true,
    });
  });

  it('keeps menu open while authenticating/loading and handles export edge cases', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    let resolveAuthorize: ((value: unknown) => void) | null = null;
    authorizeMock.mockReturnValue(
      new Promise(resolve => {
        resolveAuthorize = resolve;
      })
    );

    const processingErrorApi = createGridApi({
      forEachNode: vi.fn(() => {
        throw new Error('row api unavailable');
      }),
    });

    const authPlaceholderTab = {
      document: { write: vi.fn() },
      location: { href: '' },
      close: vi.fn(),
      closed: false,
    };
    const loadingPlaceholderTab = {
      document: {
        write: vi.fn(() => {
          throw new Error('write failed');
        }),
      },
      location: { href: '' },
      close: vi.fn(),
      closed: false,
    };

    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(authPlaceholderTab as never)
      .mockReturnValueOnce(loadingPlaceholderTab as never)
      .mockReturnValueOnce(loadingPlaceholderTab as never);

    const { rerender } = render(
      <ExportDropdown gridApi={processingErrorApi as never} />
    );

    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Google Sheets'));

    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    resolveAuthorize?.('token');
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Please allow popups to open Google Sheets.'
      );
    });
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');

    isAuthorizedMock.mockReturnValue(true);

    await user.click(screen.getByText('Export ke Google Sheets'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to export to Google Sheets: Failed to retrieve grid data. Please ensure grid is ready.'
      );
      expect(authPlaceholderTab.close).toHaveBeenCalled();
    });

    const noUrlApi = createGridApi();
    exportGridDataToSheetsMock.mockResolvedValueOnce('');

    rerender(<ExportDropdown gridApi={noUrlApi as never} />);
    if (!screen.queryByText('Export ke Google Sheets')) {
      await user.click(screen.getByTitle('Export Data'));
    }
    await user.click(screen.getByText('Export ke Google Sheets'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to create Google Sheet. Please try again.'
      );
      expect(loadingPlaceholderTab.close).toHaveBeenCalled();
    });

    exportGridDataToSheetsMock.mockRejectedValueOnce(
      new Error('Authentication token expired')
    );
    if (!screen.queryByText('Export ke Google Sheets')) {
      await user.click(screen.getByTitle('Export Data'));
    }
    await user.click(screen.getByText('Export ke Google Sheets'));
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        'Your Google authentication has expired. Click OK to re-authenticate and try again.'
      );
    });
  });

  it('covers valueGetter fallback column helpers, nested nulls, and fallback direct-field recovery', async () => {
    const user = userEvent.setup();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    isAuthorizedMock.mockReturnValue(true);
    const placeholderTab = {
      document: { write: vi.fn() },
      location: { href: '' },
      close: vi.fn(),
      closed: false,
    };
    vi.spyOn(window, 'open').mockReturnValue(placeholderTab as never);

    const gridApi = createGridApi({
      getColumnDefs: vi.fn(() => [
        { field: 'name', headerName: 'Name' },
        { field: 'manufacturer.name', headerName: 'Manufacturer' },
        {
          field: 'withGetter',
          headerName: 'WithGetter',
          valueGetter: ({
            column,
          }: {
            column: {
              getColId: () => string;
              getColDef: () => { headerName?: string };
            };
          }) => `${column.getColId()}:${column.getColDef().headerName}`,
        },
        {
          field: 'errorField',
          headerName: 'Err',
          valueGetter: () => {
            throw new Error('getter-failed');
          },
        },
      ]),
      forEachNode: vi.fn(callback => {
        callback({
          data: {
            name: 'Paracetamol',
            manufacturer: null,
            errorField: 'recover-me',
          },
          group: false,
        });
      }),
      getColumn: vi.fn(() => null),
    });

    render(<ExportDropdown gridApi={gridApi as never} filename="fallbacks" />);
    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Google Sheets'));

    await waitFor(() => {
      expect(exportGridDataToSheetsMock).toHaveBeenCalledWith(
        [['Paracetamol', '', 'withGetter:WithGetter', 'recover-me']],
        ['Name', 'Manufacturer', 'WithGetter', 'Err'],
        'fallbacks'
      );
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ ValueGetter error for column errorField:'),
      expect.any(Error)
    );
    warnSpy.mockRestore();
  });

  it('returns early from Google export when grid is destroyed after opening menu', async () => {
    const user = userEvent.setup();
    let destroyed = false;
    const gridApi = createGridApi({
      isDestroyed: vi.fn(() => destroyed),
    });

    render(<ExportDropdown gridApi={gridApi as never} />);
    await user.click(screen.getByTitle('Export Data'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    destroyed = true;
    await user.click(screen.getByText('Export ke Google Sheets'));
    expect(initializeMock).not.toHaveBeenCalled();
  });

  it('runs auth-success path and retries token-expired export when user confirms', async () => {
    const user = userEvent.setup();
    isAuthorizedMock.mockReturnValue(false);
    authorizeMock.mockResolvedValue('token-ok');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    exportGridDataToSheetsMock
      .mockRejectedValueOnce(new Error('Authentication token expired'))
      .mockResolvedValueOnce('https://docs.google.com/spreadsheets/d/retried');

    const firstTab = {
      document: { write: vi.fn() },
      location: { href: '' },
      close: vi.fn(),
      closed: false,
    };
    const retryTab = {
      document: { write: vi.fn() },
      location: { href: '' },
      close: vi.fn(),
      closed: false,
    };
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValueOnce(firstTab as never)
      .mockReturnValueOnce(retryTab as never);

    render(<ExportDropdown gridApi={createGridApi() as never} />);
    await user.click(screen.getByTitle('Export Data'));
    await user.click(screen.getByText('Export ke Google Sheets'));

    await waitFor(() => {
      expect(authorizeMock).toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalledWith(
        'Your Google authentication has expired. Click OK to re-authenticate and try again.'
      );
      expect(retryTab.location.href).toBe(
        'https://docs.google.com/spreadsheets/d/retried'
      );
    });
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');

    confirmSpy.mockRestore();
  });
});
