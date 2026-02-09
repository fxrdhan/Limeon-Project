import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemFormHeader from './ItemFormHeader';

const historyPortalProps = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);

vi.mock('@/components/card', () => ({
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('@/components/button', () => ({
  default: React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<'button'>
  >(function MockButton(props, ref) {
    const { children, ...rest } = props;
    return (
      <button ref={ref} {...rest}>
        {children}
      </button>
    );
  }),
}));

vi.mock('react-icons/tb', () => ({
  TbArrowBackUp: () => <span data-testid="reset-icon" />,
  TbX: () => <span data-testid="close-icon" />,
}));

vi.mock('./ItemHistoryPortal', () => ({
  default: (props: Record<string, unknown>) => {
    historyPortalProps.push(props);
    return <div data-testid="history-portal">{String(props.isOpen)}</div>;
  },
}));

describe('ItemFormHeader', () => {
  beforeEach(() => {
    historyPortalProps.length = 0;
  });

  it('renders add mode title, supports reset, and triggers close when allowed', () => {
    const onReset = vi.fn();
    const onClose = vi.fn();

    render(
      <ItemFormHeader
        isEditMode={false}
        isClosing={false}
        onReset={onReset}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Tambah Data Item Baru')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reset All/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('history-portal')).not.toBeInTheDocument();
  });

  it('renders edit mode timestamp and toggles history portal', () => {
    const onVersionSelect = vi.fn();

    render(
      <ItemFormHeader
        isEditMode={true}
        formattedUpdateAt="2026-02-09"
        isClosing={false}
        onClose={vi.fn()}
        history={[
          {
            id: 'h-1',
            version_number: 1,
            changed_at: '2026-02-01',
            action_type: 'UPDATE',
            entity_data: {},
          },
        ]}
        selectedVersion={1}
        currentVersion={2}
        onVersionSelect={onVersionSelect}
        entityId="item-1"
      />
    );

    expect(screen.getByText('Edit Data Item')).toBeInTheDocument();
    expect(historyPortalProps.at(-1)).toMatchObject({
      isOpen: false,
      selectedVersion: 1,
      currentVersion: 2,
      entityId: 'item-1',
      onVersionSelect,
    });

    fireEvent.click(screen.getByRole('button', { name: '2026-02-09' }));
    expect(historyPortalProps.at(-1)).toMatchObject({
      isOpen: true,
    });
  });

  it('does not call onClose when closing flag is active', () => {
    const onClose = vi.fn();
    render(
      <ItemFormHeader isEditMode={false} isClosing={true} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('hides history portal when version selection callback is missing', () => {
    render(
      <ItemFormHeader
        isEditMode={true}
        formattedUpdateAt="2026-02-09"
        isClosing={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('history-portal')).not.toBeInTheDocument();
  });
});
