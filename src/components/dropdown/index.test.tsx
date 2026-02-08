import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dropdown from './index';

const capturedContext = vi.hoisted(() => ({
  value: null as unknown,
}));

const useDropdownStateMock = vi.hoisted(() => vi.fn());
const useDropdownSearchMock = vi.hoisted(() => vi.fn());
const useDropdownValidationMock = vi.hoisted(() => vi.fn());
const useDropdownPositionMock = vi.hoisted(() => vi.fn());
const useKeyboardNavigationMock = vi.hoisted(() => vi.fn());
const useTextExpansionMock = vi.hoisted(() => vi.fn());
const useFocusManagementMock = vi.hoisted(() => vi.fn());
const useScrollManagementMock = vi.hoisted(() => vi.fn());
const useDropdownEffectsMock = vi.hoisted(() => vi.fn());
const useHoverDetailMock = vi.hoisted(() => vi.fn());

vi.mock('./providers/DropdownContext', () => ({
  DropdownProvider: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: unknown;
  }) => {
    capturedContext.value = value;
    return <div data-testid="dropdown-provider">{children}</div>;
  },
}));

vi.mock('./components/DropdownButton', () => ({
  default: React.forwardRef<
    HTMLButtonElement,
    {
      onClick?: (e: React.MouseEvent) => void;
      onBlur?: () => void;
      onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
    }
  >((props, ref) => (
    <button
      data-testid="dropdown-button"
      ref={ref}
      onClick={props.onClick}
      onBlur={props.onBlur}
      onKeyDown={props.onKeyDown}
      type="button"
    >
      Button
    </button>
  )),
}));

vi.mock('./components/DropdownMenu', () => ({
  default: React.forwardRef<
    HTMLDivElement,
    {
      onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
      leaveTimeoutRef?: React.RefObject<NodeJS.Timeout | null>;
    }
  >((props, ref) => (
    <div data-testid="dropdown-menu" ref={ref}>
      <input
        data-testid="dropdown-search"
        onKeyDown={props.onSearchKeyDown}
        aria-label="dropdown-search"
      />
    </div>
  )),
}));

vi.mock('@/components/validation-overlay', () => ({
  default: () => <div data-testid="validation-overlay" />,
}));

vi.mock('./components/HoverDetailPortal', () => ({
  default: () => <div data-testid="hover-detail-portal" />,
}));

vi.mock('./hooks/useDropdownState', () => ({
  useDropdownState: useDropdownStateMock,
}));
vi.mock('./hooks/useDropdownSearch', () => ({
  useDropdownSearch: useDropdownSearchMock,
}));
vi.mock('./hooks/useDropdownValidation', () => ({
  useDropdownValidation: useDropdownValidationMock,
}));
vi.mock('./hooks/useDropdownPosition', () => ({
  useDropdownPosition: useDropdownPositionMock,
}));
vi.mock('./hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: useKeyboardNavigationMock,
}));
vi.mock('./hooks/useTextExpansion', () => ({
  useTextExpansion: useTextExpansionMock,
}));
vi.mock('./hooks/useFocusManagement', () => ({
  useFocusManagement: useFocusManagementMock,
}));
vi.mock('./hooks/useScrollManagement', () => ({
  useScrollManagement: useScrollManagementMock,
}));
vi.mock('./hooks/useDropdownEffects', () => ({
  useDropdownEffects: useDropdownEffectsMock,
}));
vi.mock('./hooks/useHoverDetail', () => ({
  useHoverDetail: useHoverDetailMock,
}));

describe('Dropdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDropdownStateMock.mockReset();
    useDropdownSearchMock.mockReset();
    useDropdownValidationMock.mockReset();
    useDropdownPositionMock.mockReset();
    useKeyboardNavigationMock.mockReset();
    useTextExpansionMock.mockReset();
    useFocusManagementMock.mockReset();
    useScrollManagementMock.mockReset();
    useDropdownEffectsMock.mockReset();
    useHoverDetailMock.mockReset();

    const toggleDropdown = vi.fn();
    const openThisDropdown = vi.fn();
    const actualCloseDropdown = vi.fn();
    const setApplyOpenStyles = vi.fn();

    const resetSearch = vi.fn();
    const handleSearchChange = vi.fn();

    const setTouched = vi.fn();
    const setShowValidationOverlay = vi.fn();
    const validateDropdown = vi.fn(() => false);
    const handleCloseValidation = vi.fn();
    const handleValidationAutoHide = vi.fn();

    const calculateDropdownPosition = vi.fn();
    const resetPosition = vi.fn();

    const setHighlightedIndex = vi.fn();
    const setIsKeyboardNavigation = vi.fn();
    const handleDropdownKeyDown = vi.fn();

    const setExpandedId = vi.fn();
    const manageFocusOnOpen = vi.fn();
    const handleFocusOut = vi.fn();
    const checkScroll = vi.fn();

    const setIsHovered = vi.fn();
    const handleTriggerAreaEnter = vi.fn();
    const handleMenuEnter = vi.fn();
    const handleMouseLeaveWithCloseIntent = vi.fn();

    const handleOptionHover = vi.fn();
    const handleOptionLeave = vi.fn();

    useDropdownStateMock.mockReturnValue({
      isOpen: true,
      isClosing: false,
      applyOpenStyles: true,
      setApplyOpenStyles,
      openThisDropdown,
      actualCloseDropdown,
      toggleDropdown,
    });

    useDropdownSearchMock.mockReturnValue({
      searchTerm: '',
      searchState: 'idle',
      filteredOptions: [{ id: '1', name: 'Paracetamol' }],
      handleSearchChange,
      resetSearch,
    });

    useDropdownValidationMock.mockReturnValue({
      hasError: false,
      errorMessage: null,
      touched: false,
      setTouched,
      showValidationOverlay: false,
      setShowValidationOverlay,
      hasAutoHidden: false,
      validateDropdown,
      handleCloseValidation,
      handleValidationAutoHide,
    });

    useDropdownPositionMock.mockReturnValue({
      dropDirection: 'down',
      portalStyle: { left: '0px' },
      isPositionReady: true,
      calculateDropdownPosition,
      resetPosition,
    });

    useKeyboardNavigationMock.mockReturnValue({
      highlightedIndex: 0,
      isKeyboardNavigation: false,
      setHighlightedIndex,
      setIsKeyboardNavigation,
      handleDropdownKeyDown,
    });

    useTextExpansionMock.mockReturnValue({
      expandedId: null,
      setExpandedId,
    });

    useFocusManagementMock.mockReturnValue({
      manageFocusOnOpen,
      handleFocusOut,
    });

    useScrollManagementMock.mockReturnValue({
      scrollState: {
        isScrollable: false,
        reachedBottom: false,
        scrolledFromTop: false,
      },
      checkScroll,
    });

    useDropdownEffectsMock.mockReturnValue({
      isHovered: false,
      setIsHovered,
      leaveTimeoutRef: { current: null },
      handleTriggerAreaEnter,
      handleMenuEnter,
      handleMouseLeaveWithCloseIntent,
    });

    useHoverDetailMock.mockReturnValue({
      isVisible: false,
      position: { top: 0, left: 0, direction: 'right' },
      data: null,
      handleOptionHover,
      handleOptionLeave,
    });
  });

  it('handles single-selection flow and closes dropdown', () => {
    const onChange = vi.fn();
    const focusSpy = vi.spyOn(HTMLButtonElement.prototype, 'focus');

    render(
      <Dropdown
        options={[{ id: '1', name: 'Paracetamol' }]}
        value=""
        onChange={onChange}
        name="item"
      />
    );

    const context = capturedContext.value as {
      onSelect: (optionId: string) => void;
    };

    context.onSelect('1');

    const state = useDropdownStateMock.mock.results.at(-1)?.value as {
      actualCloseDropdown: ReturnType<typeof vi.fn>;
    };
    const search = useDropdownSearchMock.mock.results.at(-1)?.value as {
      resetSearch: ReturnType<typeof vi.fn>;
    };
    const validation = useDropdownValidationMock.mock.results.at(-1)?.value as {
      handleCloseValidation: ReturnType<typeof vi.fn>;
    };

    expect(onChange).toHaveBeenCalledWith('1');
    expect(validation.handleCloseValidation).toHaveBeenCalled();
    expect(state.actualCloseDropdown).toHaveBeenCalled();
    expect(search.resetSearch).toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('handles checkbox mode without closing and exposes hover detail handlers', () => {
    const onChange = vi.fn();

    render(
      <Dropdown
        withCheckbox
        options={[
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ]}
        value={['1']}
        onChange={onChange}
        name="items"
        enableHoverDetail
      />
    );

    const context = capturedContext.value as {
      onSelect: (optionId: string) => void;
      onHoverDetailShow?: unknown;
      onHoverDetailHide?: unknown;
    };
    context.onSelect('2');

    const state = useDropdownStateMock.mock.results.at(-1)?.value as {
      actualCloseDropdown: ReturnType<typeof vi.fn>;
    };
    const validation = useDropdownValidationMock.mock.results.at(-1)?.value as {
      handleCloseValidation: ReturnType<typeof vi.fn>;
    };

    expect(onChange).toHaveBeenCalledWith(['1', '2']);
    expect(validation.handleCloseValidation).toHaveBeenCalled();
    expect(state.actualCloseDropdown).not.toHaveBeenCalled();
    expect(context.onHoverDetailShow).toBeDefined();
    expect(context.onHoverDetailHide).toBeDefined();
  });

  it('runs blur validation and renders optional portals', () => {
    render(
      <Dropdown
        options={[{ id: '1', name: 'A' }]}
        value=""
        onChange={vi.fn()}
        name="item"
        validate
        showValidationOnBlur
        enableHoverDetail
      />
    );

    fireEvent.blur(screen.getByTestId('dropdown-button'));

    const validation = useDropdownValidationMock.mock.results.at(-1)?.value as {
      setTouched: ReturnType<typeof vi.fn>;
      setShowValidationOverlay: ReturnType<typeof vi.fn>;
      validateDropdown: ReturnType<typeof vi.fn>;
    };

    expect(validation.setTouched).toHaveBeenCalledWith(true);
    expect(validation.validateDropdown).toHaveBeenCalled();
    expect(validation.setShowValidationOverlay).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('validation-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('hover-detail-portal')).toBeInTheDocument();
  });

  it('forwards search keydown to keyboard navigation for navigation keys', () => {
    render(
      <Dropdown
        options={[{ id: '1', name: 'A' }]}
        value=""
        onChange={vi.fn()}
        name="item"
      />
    );

    fireEvent.keyDown(screen.getByTestId('dropdown-search'), {
      key: 'ArrowDown',
    });
    fireEvent.keyDown(screen.getByTestId('dropdown-search'), { key: 'a' });

    const keyboard = useKeyboardNavigationMock.mock.results.at(-1)?.value as {
      handleDropdownKeyDown: ReturnType<typeof vi.fn>;
    };
    expect(keyboard.handleDropdownKeyDown).toHaveBeenCalledTimes(1);
  });
});
