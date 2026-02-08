import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemModalTemplate from './ItemModalTemplate';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

vi.mock('@/components/card', () => ({
  CardFooter: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/form-action', () => ({
  default: ({
    onCancel,
    onDelete,
    isSubmitDisabled,
  }: {
    onCancel: () => void;
    onDelete?: () => void;
    isSubmitDisabled?: boolean;
  }) => (
    <div>
      <button type="button" onClick={onCancel}>
        cancel-action
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete}>
          delete-action
        </button>
      ) : null}
      <button type="submit" disabled={isSubmitDisabled}>
        submit-action
      </button>
    </div>
  ),
}));

const baseProps = () => ({
  isOpen: true,
  isClosing: false,
  onBackdropClick: vi.fn(),
  onSubmit: vi.fn((event: React.FormEvent) => event.preventDefault()),
  rightColumnProps: { className: 'right-column-test', 'data-extra': 'yes' },
  children: {
    header: <div data-testid="header">Header</div>,
    basicInfoRequired: (
      <div>
        <button type="button" tabIndex={1}>
          first-focus
        </button>
      </div>
    ),
    basicInfoOptional: (
      <div data-section-content="true">
        <input name="conversion_rate" tabIndex={2} />
      </div>
    ),
    settingsForm: <div data-testid="settings">Settings</div>,
    pricingForm: <div data-testid="pricing">Pricing</div>,
    packageConversionManager: <div data-testid="conversion">Conversion</div>,
    modals: <div data-testid="modals">Modals</div>,
  },
  formAction: {
    onCancel: vi.fn(),
    onDelete: vi.fn(),
    isSaving: false,
    isDeleting: false,
    isEditMode: true,
    isDisabled: false,
    isSubmitDisabled: false,
    saveText: 'Simpan',
    updateText: 'Update',
    deleteText: 'Hapus',
  },
});

describe('ItemModalTemplate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
      () =>
        ({
          length: 1,
          item: () => null,
          [Symbol.iterator]: function* iterator() {},
        }) as DOMRectList
    );
  });

  it('renders modal content, handles backdrop and form actions', async () => {
    const props = baseProps();

    render(<ItemModalTemplate {...props} />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('settings')).toBeInTheDocument();
    expect(screen.getByTestId('pricing')).toBeInTheDocument();
    expect(screen.getByTestId('conversion')).toBeInTheDocument();
    expect(screen.getByTestId('modals')).toBeInTheDocument();

    const rightColumn = screen.getByTestId('settings').parentElement;
    expect(rightColumn?.className).toContain('right-column-test');

    fireEvent.click(screen.getByText('cancel-action'));
    fireEvent.click(screen.getByText('delete-action'));
    fireEvent.click(screen.getByText('submit-action'));

    expect(props.formAction.onCancel).toHaveBeenCalled();
    expect(props.formAction.onDelete).toHaveBeenCalled();
    expect(props.onSubmit).toHaveBeenCalled();

    const conversionInput = screen.getByRole('textbox', {
      name: '',
    }) as HTMLInputElement;
    conversionInput.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    await waitFor(() => {
      expect(screen.getByText('first-focus')).toHaveFocus();
    });

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(props.onBackdropClick).toHaveBeenCalled();
  });

  it('supports full-width history layout and closed state', () => {
    const props = baseProps();
    props.children = {
      ...props.children,
      settingsForm: null,
      pricingForm: null,
      packageConversionManager: null,
    };

    const { rerender } = render(<ItemModalTemplate {...props} />);
    expect(screen.getByText('first-focus')).toBeInTheDocument();

    rerender(<ItemModalTemplate {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
