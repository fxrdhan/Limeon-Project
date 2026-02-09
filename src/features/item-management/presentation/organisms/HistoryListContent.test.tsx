import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryListContent from './HistoryListContent';

const closeComparisonMock = vi.hoisted(() => vi.fn());
const openComparisonMock = vi.hoisted(() => vi.fn());
const openDualComparisonMock = vi.hoisted(() => vi.fn());
const closeHistoryMock = vi.hoisted(() => vi.fn());
const useEntityModalMock = vi.hoisted(() => vi.fn());
const useHistorySelectionMock = vi.hoisted(() => vi.fn());
const softRestoreEntityMock = vi.hoisted(() => vi.fn());
const hardRollbackEntityMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

let latestSelectionOptions:
  | {
      onVersionSelect?: (item: { id: string }) => void;
      onVersionDeselect?: () => void;
      onCompareSelect?: (items: [{ id: string }, { id: string }]) => void;
      onSelectionEmpty?: () => void;
    }
  | undefined;
let latestTimelineProps:
  | {
      onRestore?: (version: number) => void;
      allowMultiSelect?: boolean;
      isFlipped?: boolean;
    }
  | undefined;

vi.mock('@/components/button', () => ({
  default: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@headlessui/react', () => ({
  Transition: ({ show, children }: { show: boolean; children: ReactNode }) =>
    show ? <>{children}</> : null,
  TransitionChild: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../shared/contexts/EntityModalContext', () => ({
  useEntityModal: useEntityModalMock,
}));

vi.mock('../hooks/useHistoryManagement', () => ({
  useHistorySelection: useHistorySelectionMock,
}));

vi.mock('./HistoryTimelineList', () => ({
  default: ({
    onRestore,
    allowMultiSelect,
    isFlipped,
  }: {
    onRestore?: (version: number) => void;
    allowMultiSelect?: boolean;
    isFlipped?: boolean;
  }) => {
    latestTimelineProps = { onRestore, allowMultiSelect, isFlipped };

    return (
      <div>
        <button type="button" onClick={() => onRestore?.(2)}>
          open-restore-v2
        </button>
      </div>
    );
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock('../../infrastructure/itemHistory.service', () => ({
  itemHistoryService: {
    softRestoreEntity: softRestoreEntityMock,
    hardRollbackEntity: hardRollbackEntityMock,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

const historyData = [
  {
    id: 'h1',
    version_number: 1,
    action_type: 'INSERT' as const,
    changed_at: '2026-01-01T10:00:00.000Z',
    entity_data: { id: 'item-1', code: 'IT-1', name: 'Item v1' },
  },
  {
    id: 'h2',
    version_number: 2,
    action_type: 'UPDATE' as const,
    changed_at: '2026-01-02T10:00:00.000Z',
    entity_data: {
      id: 'item-1',
      code: 'IT-2',
      name: 'Item v2',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    },
  },
];

const createContextValue = (
  overrides: Partial<{
    comparison: {
      isOpen: boolean;
      isDualMode: boolean;
      isFlipped: boolean;
    };
    history: {
      entityTable: string;
      entityId: string;
      data: typeof historyData;
      isLoading: boolean;
    };
  }> = {}
) => ({
  history: {
    entityTable: 'items',
    entityId: 'item-1',
    data: historyData,
    isLoading: false,
    ...overrides.history,
  },
  comparison: {
    isOpen: false,
    isDualMode: true,
    isFlipped: true,
    ...overrides.comparison,
  },
  uiActions: {
    closeComparison: closeComparisonMock,
    openComparison: openComparisonMock,
    openDualComparison: openDualComparisonMock,
    closeHistory: closeHistoryMock,
  },
});

describe('HistoryListContent', () => {
  beforeEach(() => {
    latestSelectionOptions = undefined;
    latestTimelineProps = undefined;

    closeComparisonMock.mockReset();
    openComparisonMock.mockReset();
    openDualComparisonMock.mockReset();
    closeHistoryMock.mockReset();
    useEntityModalMock.mockReset();
    useHistorySelectionMock.mockReset();
    softRestoreEntityMock.mockReset();
    hardRollbackEntityMock.mockReset();
    invalidateQueriesMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    useEntityModalMock.mockReturnValue(createContextValue());
    useHistorySelectionMock.mockImplementation(options => {
      latestSelectionOptions = options as typeof latestSelectionOptions;
      return {
        selectedVersion: 2,
        handleVersionClick: vi.fn(),
        handleCompareSelected: vi.fn(),
        handleSelectionEmpty: vi.fn(),
      };
    });

    softRestoreEntityMock.mockResolvedValue({ data: null, error: null });
    hardRollbackEntityMock.mockResolvedValue({
      data: { deleted_count: 3 },
      error: null,
    });
    invalidateQueriesMock.mockResolvedValue(undefined);
  });

  it('maps history-selection callbacks and completes soft restore flow', async () => {
    useEntityModalMock.mockReturnValue(
      createContextValue({
        comparison: { isOpen: true, isDualMode: true, isFlipped: true },
      })
    );

    render(<HistoryListContent compareMode={true} />);

    act(() => {
      latestSelectionOptions?.onVersionSelect?.({ id: 'h2' });
      latestSelectionOptions?.onVersionDeselect?.();
      latestSelectionOptions?.onCompareSelect?.([{ id: 'h1' }, { id: 'h2' }]);
      latestSelectionOptions?.onSelectionEmpty?.();
    });

    expect(openComparisonMock).toHaveBeenCalledWith(historyData[1]);
    expect(openDualComparisonMock).toHaveBeenCalledWith(
      historyData[0],
      historyData[1]
    );
    expect(closeComparisonMock).toHaveBeenCalledTimes(2);
    expect(latestTimelineProps?.allowMultiSelect).toBe(true);
    expect(latestTimelineProps?.isFlipped).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'open-restore-v2' }));
    expect(closeComparisonMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText('Restore ke Versi 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Soft Restore' }));

    await waitFor(() => {
      expect(softRestoreEntityMock).toHaveBeenCalledWith({
        entityTable: 'items',
        entityId: 'item-1',
        restoreData: { code: 'IT-2', name: 'Item v2' },
      });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Berhasil restore ke versi 2'
    );
    expect(hardRollbackEntityMock).not.toHaveBeenCalled();
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(1);
    expect(closeHistoryMock).toHaveBeenCalledTimes(1);
  });

  it('runs hard rollback and continues when query invalidation fails', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    invalidateQueriesMock.mockRejectedValueOnce(new Error('invalidate failed'));

    render(<HistoryListContent />);

    fireEvent.click(screen.getByRole('button', { name: 'open-restore-v2' }));
    fireEvent.click(screen.getByDisplayValue('hard'));
    fireEvent.click(screen.getByRole('button', { name: 'Hard Rollback' }));

    await waitFor(() => {
      expect(hardRollbackEntityMock).toHaveBeenCalledWith({
        entityTable: 'items',
        entityId: 'item-1',
        targetVersion: 2,
      });
    });

    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Berhasil menghapus 3 versi setelah v2'
    );
    expect(closeHistoryMock).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to invalidate queries after restore',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('shows restore error toast when selected version is not found', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    useEntityModalMock.mockReturnValue(
      createContextValue({
        history: {
          entityTable: 'items',
          entityId: 'item-1',
          data: [historyData[0]],
          isLoading: false,
        },
      })
    );

    render(<HistoryListContent />);

    act(() => {
      latestTimelineProps?.onRestore?.(99);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Soft Restore' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Gagal restore: Error: Version 99 not found'
      );
    });
    expect(softRestoreEntityMock).not.toHaveBeenCalled();
    expect(hardRollbackEntityMock).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
