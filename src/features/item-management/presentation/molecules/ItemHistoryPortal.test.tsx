import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import ItemHistoryPortal from './ItemHistoryPortal';

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

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      variants: _variants,
      ...props
    }: {
      animate?: unknown;
      children?: ReactNode;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
      variants?: unknown;
    } & React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      layoutId: _layoutId,
      transition: _transition,
      variants: _variants,
      ...props
    }: {
      animate?: unknown;
      children?: ReactNode;
      exit?: unknown;
      initial?: unknown;
      layoutId?: string;
      transition?: unknown;
      variants?: unknown;
    } & React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock('../organisms/HistoryTimelineList', () => ({
  default: ({ onRestore }: { onRestore?: (version: number) => void }) => (
    <>
      <button
        type="button"
        onClick={() => {
          onRestore?.(1);
        }}
      >
        Restore version 1
      </button>
      <button
        type="button"
        onClick={() => {
          onRestore?.(2);
        }}
      >
        Restore version 2
      </button>
    </>
  ),
}));

vi.mock('./HistoryRestoreDialog', () => ({
  default: ({
    isOpen,
    onCancel,
    onConfirm,
    targetVersion,
  }: {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    targetVersion: number | null;
  }) =>
    isOpen ? (
      <div>
        <span>Target version {targetVersion}</span>
        <button type="button" onClick={onCancel}>
          Cancel restore
        </button>
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

describe('ItemHistoryPortal', () => {
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

  const renderPortal = ({
    entityId = 'item-1',
    onClose = vi.fn(),
  }: {
    entityId?: string;
    onClose?: () => void;
  } = {}) => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);

    return render(
      <ItemHistoryPortal
        isOpen
        onClose={onClose}
        history={history}
        isLoading={false}
        selectedVersion={null}
        onVersionSelect={vi.fn()}
        triggerRef={{ current: trigger }}
        entityTable="items"
        entityId={entityId}
      />
    );
  };

  it('ignores duplicate restore confirms while restore is in flight', () => {
    softRestoreEntityMock.mockReturnValue(new Promise(() => undefined));

    renderPortal();

    fireEvent.click(screen.getByRole('button', { name: 'Restore version 1' }));
    const confirmButton = screen.getByRole('button', {
      name: 'Confirm restore',
    });

    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(softRestoreEntityMock).toHaveBeenCalledTimes(1);
    expect(softRestoreEntityMock).toHaveBeenCalledWith({
      entityTable: 'items',
      entityId: 'item-1',
      restoreData: {
        name: 'Paracetamol',
      },
    });
  });

  it('does not finish stale restore UI after the entity changes', async () => {
    const onClose = vi.fn();
    const deferredRestore = createDeferred<{ error: null }>();
    softRestoreEntityMock.mockReturnValue(deferredRestore.promise);

    const { rerender } = renderPortal({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Restore version 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm restore' }));

    rerender(
      <ItemHistoryPortal
        isOpen
        onClose={onClose}
        history={history}
        isLoading={false}
        selectedVersion={null}
        onVersionSelect={vi.fn()}
        triggerRef={{ current: document.createElement('button') }}
        entityTable="items"
        entityId="item-2"
      />
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
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps a newly opened restore target after the previous close delay', () => {
    vi.useFakeTimers();
    try {
      renderPortal();

      fireEvent.click(
        screen.getByRole('button', { name: 'Restore version 1' })
      );
      fireEvent.click(screen.getByRole('button', { name: 'Cancel restore' }));
      fireEvent.click(
        screen.getByRole('button', { name: 'Restore version 2' })
      );

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(screen.getByText('Target version 2')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
