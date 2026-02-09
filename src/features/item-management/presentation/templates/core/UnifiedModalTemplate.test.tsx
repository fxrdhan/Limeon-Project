import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityModal, ItemModal, UnifiedModal } from './UnifiedModalTemplate';

const motionDivProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const formActionProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.ComponentPropsWithoutRef<'div'> & {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => {
      motionDivProps.push(props);
      return <div {...props}>{children}</div>;
    },
    form: ({
      children,
      ...props
    }: React.ComponentPropsWithoutRef<'form'> & {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <form {...props}>{children}</form>,
  },
}));

vi.mock('@/components/card', () => ({
  CardFooter: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-footer" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/form-action', () => ({
  default: (props: Record<string, unknown>) => {
    formActionProps.push(props);
    return <div data-testid="form-action" />;
  },
}));

describe('UnifiedModalTemplate', () => {
  beforeEach(() => {
    motionDivProps.length = 0;
    formActionProps.length = 0;
  });

  it('returns null when modal is closed', () => {
    const { container } = render(
      <UnifiedModal isOpen={false} isClosing={false} onBackdropClick={vi.fn()}>
        <div>hidden</div>
      </UnifiedModal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles backdrop click only when not closing and target is backdrop', () => {
    const onBackdropClick = vi.fn();
    render(
      <UnifiedModal
        isOpen={true}
        isClosing={false}
        onBackdropClick={onBackdropClick}
      >
        <button type="button">modal-content</button>
      </UnifiedModal>
    );

    const backdrop = document.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop as Element);
    fireEvent.click(screen.getByText('modal-content'));
    expect(onBackdropClick).toHaveBeenCalledTimes(1);
  });

  it('ignores backdrop click while closing', () => {
    const onBackdropClick = vi.fn();
    render(
      <UnifiedModal
        isOpen={true}
        isClosing={true}
        onBackdropClick={onBackdropClick}
      >
        <div>content</div>
      </UnifiedModal>
    );

    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop as Element);
    expect(onBackdropClick).not.toHaveBeenCalled();
  });

  it('renders form mode with footer and forwards submit/action config', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onCancel = vi.fn();
    const onDelete = vi.fn();

    render(
      <UnifiedModal
        isOpen={true}
        isClosing={false}
        onBackdropClick={vi.fn()}
        onSubmit={onSubmit}
        layout={{ enableForm: true, enableFooter: true }}
        formAction={{
          onCancel,
          onDelete,
          isSaving: false,
          isDeleting: false,
          isEditMode: true,
          isDisabled: false,
        }}
      >
        <div>form-children</div>
      </UnifiedModal>
    );

    const form = document.querySelector('form');
    expect(form).toBeInTheDocument();
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
    expect(screen.getByTestId('form-action')).toBeInTheDocument();

    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    expect(formActionProps[0]).toMatchObject({
      onCancel,
      onDelete,
      isSaving: false,
      isDeleting: false,
      isEditMode: true,
      cancelTabIndex: 20,
      saveTabIndex: 21,
      saveText: 'Simpan',
      updateText: 'Update',
      deleteText: 'Hapus',
    });
  });

  it('applies comparison offset on modal variant', () => {
    render(
      <UnifiedModal
        isOpen={true}
        isClosing={false}
        onBackdropClick={vi.fn()}
        comparisonOffset={true}
      >
        <div>offset modal</div>
      </UnifiedModal>
    );

    const modalDiv = motionDivProps.find(
      props =>
        typeof props.className === 'string' &&
        props.className.includes('rounded-xl bg-white')
    ) as
      | {
          variants?: {
            visible?: {
              x?: number;
            };
          };
        }
      | undefined;

    expect(modalDiv?.variants?.visible?.x).toBe(-200);
  });

  it('renders EntityModal and ItemModal factory variants', () => {
    const onItemBackdropClick = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

    const { rerender } = render(
      <EntityModal
        isOpen={true}
        isClosing={false}
        onBackdropClick={vi.fn()}
        comparisonOffset={false}
      >
        <div>entity-modal-content</div>
      </EntityModal>
    );
    expect(screen.getByText('entity-modal-content')).toBeInTheDocument();
    expect(document.querySelector('form')).not.toBeInTheDocument();

    rerender(
      <ItemModal
        isOpen={true}
        isClosing={false}
        onBackdropClick={onItemBackdropClick}
        onSubmit={onSubmit}
        formAction={{
          onCancel: vi.fn(),
          isSaving: false,
          isDeleting: false,
          isEditMode: false,
          isDisabled: false,
        }}
      >
        <div>item-modal-content</div>
      </ItemModal>
    );

    expect(document.querySelector('form')).toBeInTheDocument();
    expect(screen.getByText('item-modal-content')).toBeInTheDocument();

    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop as Element);
    expect(onItemBackdropClick).toHaveBeenCalledTimes(1);
  });
});
