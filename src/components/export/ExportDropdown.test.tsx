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
});
