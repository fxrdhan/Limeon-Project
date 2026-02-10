import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityModalContent from './EntityModalContent';
import type {
  EntityData,
  EntityModalContextValue,
} from '../../../shared/types';

const useEntityModalMock = vi.hoisted(() => vi.fn());
const historyContentCompareSpy = vi.hoisted(() => vi.fn());

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      className,
      style,
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
}));

vi.mock('@/components/button', () => ({
  default: ({
    children,
    title,
    ...props
  }: React.ComponentPropsWithoutRef<'button'>) => (
    <button title={title} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../../shared/contexts/EntityModalContext', () => ({
  useEntityModal: useEntityModalMock,
}));

vi.mock('../../molecules', () => ({
  EntityFormFields: () => <div data-testid="entity-form-fields" />,
}));

vi.mock('../../organisms', () => ({
  HistoryListContent: ({ compareMode }: { compareMode?: boolean }) => {
    historyContentCompareSpy(compareMode ?? false);
    return <div data-testid="history-content">{String(compareMode)}</div>;
  },
}));

const buildContext = (
  overrides: Partial<EntityModalContextValue> = {}
): EntityModalContextValue => {
  const base: EntityModalContextValue = {
    form: {
      code: 'CAT',
      name: 'Kategori A',
      description: 'Desc',
      isDirty: true,
      isValid: true,
    },
    ui: {
      isOpen: true,
      isClosing: false,
      isEditMode: false,
      entityName: 'Kategori',
      formattedUpdateAt: '2026-02-08',
      mode: 'add',
    },
    action: {
      isLoading: false,
      isDeleting: false,
    },
    history: {
      entityTable: 'item_categories',
      entityId: 'cat-1',
      data: null,
      isLoading: false,
      error: null,
    },
    comparison: {
      isOpen: false,
      isClosing: false,
      isDualMode: false,
      isFlipped: false,
    },
    formActions: {
      setCode: vi.fn(),
      setName: vi.fn(),
      setDescription: vi.fn(),
      setAddress: vi.fn(),
      handleSubmit: vi.fn(async () => {}),
      handleDelete: vi.fn(),
      resetForm: vi.fn(),
    },
    uiActions: {
      handleClose: vi.fn(),
      handleBackdropClick: vi.fn(),
      setIsClosing: vi.fn(),
      setMode: vi.fn(),
      openHistory: vi.fn(),
      closeHistory: vi.fn(),
      selectVersion: vi.fn(),
      openComparison: vi.fn(),
      closeComparison: vi.fn(),
      openDualComparison: vi.fn(),
      flipVersions: vi.fn(),
      goBack: vi.fn(),
    },
  };

  return {
    ...base,
    ...overrides,
    form: {
      ...base.form,
      ...overrides.form,
    },
    ui: {
      ...base.ui,
      ...overrides.ui,
    },
    action: {
      ...base.action,
      ...overrides.action,
    },
    history: {
      ...base.history,
      ...overrides.history,
    },
    comparison: {
      ...base.comparison,
      ...overrides.comparison,
    },
    formActions: {
      ...base.formActions,
      ...overrides.formActions,
    },
    uiActions: {
      ...base.uiActions,
      ...overrides.uiActions,
    },
  };
};

describe('EntityModalContent', () => {
  beforeEach(() => {
    useEntityModalMock.mockReset();
    historyContentCompareSpy.mockReset();
  });

  it('renders add mode form actions and triggers cancel/save handlers', () => {
    const ctx = buildContext({
      ui: { mode: 'add', entityName: 'Kategori', isEditMode: false },
    });
    useEntityModalMock.mockReturnValue(ctx);

    render(<EntityModalContent nameInputRef={{ current: null }} />);

    expect(
      screen.getByRole('heading', { name: 'Tambah Kategori Baru' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('entity-form-fields')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Hapus' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(ctx.uiActions.handleClose).toHaveBeenCalledTimes(1);
    expect(ctx.formActions.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders edit mode header/footer and opens history with mapped table', () => {
    const ctx = buildContext({
      ui: { mode: 'edit', entityName: 'Kategori', isEditMode: true },
      form: { isDirty: true, isValid: true },
    });
    useEntityModalMock.mockReturnValue(ctx);

    render(
      <EntityModalContent
        nameInputRef={{ current: null }}
        initialData={{ id: 'cat-1', name: 'Kategori A' } as EntityData}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Edit Kategori' })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByTitle(
        'Lihat riwayat perubahan Kategori (Terakhir diubah: 2026-02-08)'
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(ctx.uiActions.openHistory).toHaveBeenCalledWith(
      'item_categories',
      'cat-1'
    );
    expect(ctx.formActions.handleDelete).toHaveBeenCalledTimes(1);
    expect(ctx.formActions.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('falls back history table map and disables submit when form is not submittable', () => {
    const ctx = buildContext({
      ui: { mode: 'edit', entityName: 'Unknown Entity', isEditMode: true },
      form: { isDirty: false, isValid: true },
      action: { isLoading: true },
    });
    useEntityModalMock.mockReturnValue(ctx);

    render(
      <EntityModalContent
        nameInputRef={{ current: null }}
        initialData={{ id: 'raw-1', name: 'X' } as EntityData}
      />
    );

    fireEvent.click(
      screen.getByTitle(
        'Lihat riwayat perubahan Unknown Entity (Terakhir diubah: 2026-02-08)'
      )
    );

    expect(ctx.uiActions.openHistory).toHaveBeenCalledWith('items', 'raw-1');
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
  });

  it('renders history mode controls, toggles compare mode, and switches mode across rerenders', () => {
    const ctx = buildContext({
      ui: { mode: 'add', entityName: 'Kategori', isEditMode: true },
    });
    useEntityModalMock.mockImplementation(() => ctx);

    const { rerender } = render(
      <EntityModalContent
        nameInputRef={{ current: null }}
        initialData={{ id: 'cat-1', name: 'Kategori A' } as EntityData}
      />
    );
    expect(screen.getByTestId('entity-form-fields')).toBeInTheDocument();

    ctx.ui.mode = 'history';
    rerender(
      <EntityModalContent
        nameInputRef={{ current: null }}
        initialData={{ id: 'cat-1', name: 'Kategori A' } as EntityData}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Riwayat Perubahan' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('history-content')).toHaveTextContent('false');

    const iconOnlyButtons = screen
      .getAllByRole('button')
      .filter(button => !button.textContent?.trim());
    fireEvent.click(iconOnlyButtons[0]);
    expect(ctx.uiActions.goBack).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Compare Mode' }));
    expect(ctx.uiActions.closeComparison).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Single View' })
    ).toBeInTheDocument();
    expect(historyContentCompareSpy).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(ctx.uiActions.handleClose).toHaveBeenCalledTimes(1);
  });
});
