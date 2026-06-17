import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GridApi } from 'ag-grid-community';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import ExportDropdown from './ExportDropdown';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      animate: _animate,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('./export-dropdown/useGoogleSheetsExport', () => ({
  useGoogleSheetsExport: () => ({
    isGoogleSheetsInitializing: false,
    isGoogleSheetsLoading: false,
    isAuthenticating: false,
    handleGoogleSheetsExport: vi.fn(),
  }),
}));

const createGridApi = (): GridApi =>
  ({
    isDestroyed: vi.fn(() => false),
    forEachNodeAfterFilterAndSort: vi.fn(callback => {
      callback({ data: { name: 'Paracetamol', stock: 12 } });
    }),
    exportDataAsCsv: vi.fn(),
    exportDataAsExcel: vi.fn(),
  }) as unknown as GridApi;

const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL'
);
const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL'
);

describe('ExportDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (createObjectUrlDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (revokeObjectUrlDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectUrlDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('cleans up the JSON download object URL when the browser rejects the click', async () => {
    const anchorClick = vi.fn(() => {
      throw new Error('download blocked');
    });
    const anchorRemove = vi.fn();
    let createdDownloadLink: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    const createObjectURL = vi.fn(() => 'blob:json-export');
    const revokeObjectURL = vi.fn();

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(document, 'createElement').mockImplementation(tagName => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a') as HTMLAnchorElement;
        Object.defineProperty(anchor, 'click', {
          configurable: true,
          value: anchorClick,
        });
        Object.defineProperty(anchor, 'remove', {
          configurable: true,
          value: anchorRemove,
        });
        createdDownloadLink = anchor;

        return anchor;
      }

      return originalCreateElement(tagName);
    });

    render(<ExportDropdown gridApi={createGridApi()} filename="inventory" />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export ke JSON' }));

    expect(anchorClick).toHaveBeenCalledOnce();
    expect(anchorRemove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:json-export');
    expect((createdDownloadLink as HTMLAnchorElement | null)?.download).toBe(
      `inventory-${new Date().toISOString().split('T')[0]}.json`
    );
    expect(mockToast.error).toHaveBeenCalledWith('Gagal export JSON');

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Export ke JSON' })
      ).toBeNull();
    });
  });
});
