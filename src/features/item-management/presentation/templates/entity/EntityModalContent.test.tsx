import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import {
  EntityModalProvider,
  type EntityModalContextValue,
  type ModalMode,
} from '../../../shared/contexts/EntityModalContext';
import EntityModalContent from './EntityModalContent';

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
  },
}));

vi.mock('../../molecules/EntityFormFields', () => ({
  default: () => <div>Form fields</div>,
}));

vi.mock('../../organisms/HistoryListContent', () => ({
  default: () => <div>History content</div>,
}));

const createContextValue = ({
  isOpen,
  mode,
}: {
  isOpen: boolean;
  mode: ModalMode;
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
    name: 'Kategori',
  },
  formActions: {
    handleDelete: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    setDescription: vi.fn(),
    setName: vi.fn(),
  },
  history: {
    data: null,
    entityId: 'entity-1',
    entityTable: 'item_categories',
    error: null,
    isLoading: false,
  },
  ui: {
    entityName: 'Kategori',
    formattedUpdateAt: '',
    isClosing: false,
    isEditMode: true,
    isOpen,
    mode,
  },
  uiActions: {
    closeComparison: vi.fn(),
    closeHistory: vi.fn(),
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

const renderEntityModalContent = ({
  isOpen,
  mode,
}: {
  isOpen: boolean;
  mode: ModalMode;
}) =>
  render(
    <EntityModalProvider value={createContextValue({ isOpen, mode })}>
      <EntityModalContent nameInputRef={{ current: null }} />
    </EntityModalProvider>
  );

describe('EntityModalContent', () => {
  const getBoundingClientRectDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'getBoundingClientRect'
  );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (getBoundingClientRectDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'getBoundingClientRect',
        getBoundingClientRectDescriptor
      );
    }
  });

  it('cancels a pending resize frame when the modal closes', () => {
    let modalHeight = 100;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          bottom: 0,
          height: modalHeight,
          left: 0,
          right: 0,
          top: 0,
          width: 340,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
    );
    let queuedFrame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      queuedFrame = callback;
      return 73;
    });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    const { container, rerender } = renderEntityModalContent({
      isOpen: true,
      mode: 'edit',
    });

    act(() => {
      vi.advanceTimersByTime(260);
    });

    modalHeight = 240;
    rerender(
      <EntityModalProvider
        value={createContextValue({ isOpen: true, mode: 'history' })}
      >
        <EntityModalContent nameInputRef={{ current: null }} />
      </EntityModalProvider>
    );

    const modalPanel = container.querySelector('.rounded-xl') as HTMLElement;
    expect(modalPanel.style.height).toBe('100px');

    rerender(
      <EntityModalProvider
        value={createContextValue({ isOpen: false, mode: 'history' })}
      >
        <EntityModalContent nameInputRef={{ current: null }} />
      </EntityModalProvider>
    );

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(73);
    expect(modalPanel.style.height).toBe('');

    act(() => {
      queuedFrame?.(0);
    });

    expect(screen.getByText('History content')).toBeTruthy();
    expect(modalPanel.style.height).toBe('');
  });
});
