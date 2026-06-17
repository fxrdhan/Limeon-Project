import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  EntityModalProvider,
  type EntityModalContextValue,
} from '../../shared/contexts/EntityModalContext';
import HistoryListContent from './HistoryListContent';
import type { HistoryRollbackAction } from './HistoryListContent.types';

const {
  hardRollbackEntityMock,
  invalidateQueriesMock,
  mockToast,
  softRestoreEntityMock,
} = vi.hoisted(() => ({
  hardRollbackEntityMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  softRestoreEntityMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('./HistoryTimelineList', () => ({
  default: ({
    history,
    onVersionClick,
  }: {
    history: Array<{
      id: string;
      version_number: number;
      entity_data: Record<string, unknown>;
    }> | null;
    onVersionClick: (item: {
      id: string;
      version_number: number;
      entity_data: Record<string, unknown>;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        const firstItem = history?.[0];
        if (firstItem) {
          onVersionClick(firstItem);
        }
      }}
    >
      Select version 1
    </button>
  ),
}));

vi.mock('../molecules/HistoryRestoreDialog', () => ({
  default: ({
    isOpen,
    onConfirm,
    targetVersion,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    targetVersion: number | null;
  }) =>
    isOpen ? (
      <div>
        <span>Target version {targetVersion}</span>
        <button type="button" onClick={onConfirm}>
          Confirm restore
        </button>
      </div>
    ) : null,
}));

vi.mock('../../infrastructure/itemHistory.service', () => ({
  itemHistoryService: {
    hardRollbackEntity: hardRollbackEntityMock,
    softRestoreEntity: softRestoreEntityMock,
  },
}));

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>(promiseResolve => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

const history = [
  {
    id: 'history-1',
    version_number: 1,
    changed_at: '2026-03-26T10:05:00.000Z',
    action_type: 'UPDATE' as const,
    entity_data: {
      id: 'item-1',
      name: 'Paracetamol',
      created_at: '2026-03-26T10:00:00.000Z',
      updated_at: '2026-03-26T10:05:00.000Z',
    },
  },
  {
    id: 'history-2',
    version_number: 2,
    changed_at: '2026-03-26T10:10:00.000Z',
    action_type: 'UPDATE' as const,
    entity_data: {
      id: 'item-1',
      name: 'Ibuprofen',
      created_at: '2026-03-26T10:00:00.000Z',
      updated_at: '2026-03-26T10:10:00.000Z',
    },
  },
];

const buildContextValue = ({
  closeHistory,
  entityId,
}: {
  closeHistory: () => void;
  entityId: string;
}): EntityModalContextValue => ({
  action: {
    isDeleting: false,
    isLoading: false,
  },
  comparison: {
    isClosing: false,
    isDualMode: false,
    isFlipped: false,
    isOpen: false,
  },
  form: {
    description: '',
    isDirty: false,
    isValid: true,
    name: 'Paracetamol',
  },
  formActions: {
    handleDelete: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    setDescription: vi.fn(),
    setName: vi.fn(),
  },
  history: {
    data: history,
    entityId,
    entityTable: 'items',
    error: null,
    isLoading: false,
  },
  ui: {
    entityName: 'Item',
    formattedUpdateAt: '',
    isClosing: false,
    isEditMode: true,
    isOpen: true,
    mode: 'history',
  },
  uiActions: {
    closeComparison: vi.fn(),
    closeHistory,
    flipVersions: vi.fn(),
    goBack: vi.fn(),
    handleBackdropClick: vi.fn(),
    handleClose: vi.fn(),
    openComparison: vi.fn(),
    openDualComparison: vi.fn(),
    openHistory: vi.fn(),
    selectVersion: vi.fn(),
    setIsClosing: vi.fn(),
    setMode: vi.fn(),
  },
});

const renderHistoryList = ({
  closeHistory,
  entityId,
  onRollbackActionChange,
}: {
  closeHistory: () => void;
  entityId: string;
  onRollbackActionChange: (action: HistoryRollbackAction | null) => void;
}) =>
  render(
    <EntityModalProvider value={buildContextValue({ closeHistory, entityId })}>
      <HistoryListContent onRollbackActionChange={onRollbackActionChange} />
    </EntityModalProvider>
  );

describe('HistoryListContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not finish stale restore UI after the entity changes', async () => {
    const closeHistory = vi.fn();
    const deferredRestore = createDeferred<{ error: null }>();
    let rollbackAction: HistoryRollbackAction | null = null;
    const onRollbackActionChange = vi.fn(
      (action: HistoryRollbackAction | null) => {
        rollbackAction = action;
      }
    );
    softRestoreEntityMock.mockReturnValue(deferredRestore.promise);

    const { rerender } = renderHistoryList({
      closeHistory,
      entityId: 'item-1',
      onRollbackActionChange,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select version 1' }));

    await waitFor(() => {
      expect(rollbackAction).not.toBeNull();
    });

    act(() => {
      rollbackAction?.onRollback();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm restore' }));

    rerender(
      <EntityModalProvider
        value={buildContextValue({ closeHistory, entityId: 'item-2' })}
      >
        <HistoryListContent onRollbackActionChange={onRollbackActionChange} />
      </EntityModalProvider>
    );

    await act(async () => {
      deferredRestore.resolve({ error: null });
      await deferredRestore.promise;
      await Promise.resolve();
    });

    expect(softRestoreEntityMock).toHaveBeenCalledWith({
      entityTable: 'items',
      entityId: 'item-1',
      restoreData: {
        name: 'Paracetamol',
      },
    });
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
    expect(closeHistory).not.toHaveBeenCalled();
  });
});
