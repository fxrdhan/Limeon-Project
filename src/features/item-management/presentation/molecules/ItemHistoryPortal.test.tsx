import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemHistoryPortal from './ItemHistoryPortal';

const useHistorySelectionMock = vi.hoisted(() => vi.fn());
const softRestoreEntityMock = vi.hoisted(() => vi.fn());
const hardRollbackEntityMock = vi.hoisted(() => vi.fn());
const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

type HistoryItemType = {
  id: string;
  version_number: number;
  changed_at: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_data: Record<string, unknown>;
};

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

vi.mock('@headlessui/react', () => ({
  Transition: ({ show, children }: { show: boolean; children: ReactNode }) =>
    show ? <>{children}</> : null,
  TransitionChild: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

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

vi.mock('../hooks/useHistoryManagement', () => ({
  useHistorySelection: useHistorySelectionMock,
}));

vi.mock('../organisms/HistoryTimelineList', () => ({
  default: ({
    history,
    onVersionClick,
    onRestore,
  }: {
    history: HistoryItemType[] | null;
    onVersionClick: (item: HistoryItemType) => void;
    onRestore?: (version: number) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => history?.[1] && onVersionClick(history[1])}
      >
        select-v2
      </button>
      <button type="button" onClick={() => onRestore?.(2)}>
        open-restore-v2
      </button>
    </div>
  ),
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

const historyData: HistoryItemType[] = [
  {
    id: 'h1',
    version_number: 1,
    changed_at: '2026-01-01T10:00:00.000Z',
    action_type: 'INSERT',
    entity_data: { id: 'item-1', code: 'IT-1', name: 'Item v1' },
  },
  {
    id: 'h2',
    version_number: 2,
    changed_at: '2026-01-02T10:00:00.000Z',
    action_type: 'UPDATE',
    entity_data: {
      id: 'item-1',
      code: 'IT-2',
      name: 'Item v2',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    },
  },
];

describe('ItemHistoryPortal', () => {
  beforeEach(() => {
    useHistorySelectionMock.mockReset();
    softRestoreEntityMock.mockReset();
    hardRollbackEntityMock.mockReset();
    invalidateQueriesMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    useHistorySelectionMock.mockImplementation(
      ({
        onVersionSelect,
      }: {
        onVersionSelect?: (item: HistoryItemType) => void;
      }) => ({
        selectedVersion: 2,
        handleVersionClick: (item: HistoryItemType) => onVersionSelect?.(item),
      })
    );

    softRestoreEntityMock.mockResolvedValue({ data: null, error: null });
    hardRollbackEntityMock.mockResolvedValue({
      data: { deleted_count: 2 },
      error: null,
    });
    invalidateQueriesMock.mockResolvedValue(undefined);
  });

  const setup = (
    overrides: Partial<ComponentProps<typeof ItemHistoryPortal>> = {}
  ) => {
    const trigger = document.createElement('button');
    trigger.getBoundingClientRect = () =>
      ({
        bottom: 100,
        right: 400,
      }) as DOMRect;
    document.body.appendChild(trigger);

    const onClose = vi.fn();
    const onVersionSelect = vi.fn();

    render(
      <ItemHistoryPortal
        isOpen={true}
        onClose={onClose}
        history={historyData}
        isLoading={false}
        selectedVersion={null}
        onVersionSelect={onVersionSelect}
        triggerRef={{ current: trigger }}
        entityTable="items"
        entityId="item-1"
        {...overrides}
      />
    );

    return { trigger, onClose, onVersionSelect };
  };

  it('positions portal, supports selection callback, and closes on outside click/escape', () => {
    const { onClose, onVersionSelect, trigger } = setup();

    expect(screen.getByText('Riwayat Perubahan')).toBeInTheDocument();
    expect(
      screen.getByText('Pilih versi untuk melihat data')
    ).toBeInTheDocument();

    const modal = document.querySelector('.fixed.z-\\[60\\]') as HTMLElement;
    expect(modal.style.top).toBe('104px');
    expect(modal.style.left).toBe('50px');

    fireEvent.click(screen.getByRole('button', { name: 'select-v2' }));
    expect(onVersionSelect).toHaveBeenCalledWith(2, historyData[1].entity_data);

    fireEvent.mouseDown(document.body);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    document.body.removeChild(trigger);
  });

  it('completes soft restore flow and closes dialog', async () => {
    const { onClose, trigger } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'open-restore-v2' }));
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
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    document.body.removeChild(trigger);
  });

  it('handles hard rollback success and missing-version error', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { trigger } = setup();

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
      'Berhasil menghapus 2 versi setelah v2'
    );

    softRestoreEntityMock.mockClear();
    hardRollbackEntityMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'open-restore-v2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

    fireEvent.click(screen.getByRole('button', { name: 'open-restore-v2' }));
    fireEvent.click(screen.getByDisplayValue('hard'));

    hardRollbackEntityMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'rpc failed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hard Rollback' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Gagal rollback: Error: Hard rollback failed: rpc failed'
      );
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Restore error:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
    document.body.removeChild(trigger);
  });
});
