import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDropdownEffects } from './useDropdownEffects';

const createProps = (
  overrides: Partial<Parameters<typeof useDropdownEffects>[0]> = {}
): Parameters<typeof useDropdownEffects>[0] => {
  const button = document.createElement('button');
  const menu = document.createElement('div');

  Object.defineProperty(button, 'getBoundingClientRect', {
    value: () => ({
      top: 100,
      left: 100,
      right: 260,
      bottom: 140,
      width: 160,
      height: 40,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }),
  });

  return {
    isOpen: false,
    applyOpenStyles: false,
    filteredOptions: [
      { id: 'opt-1', name: 'Paracetamol' },
      { id: 'opt-2', name: 'Amoxicillin' },
    ],
    value: 'opt-1',
    setApplyOpenStyles: vi.fn(),
    setExpandedId: vi.fn(),
    calculateDropdownPosition: vi.fn(),
    manageFocusOnOpen: vi.fn(),
    handleFocusOut: vi.fn(),
    resetPosition: vi.fn(),
    resetSearch: vi.fn(),
    buttonRef: { current: button },
    dropdownMenuRef: { current: menu },
    hoverToOpen: true,
    isClosing: false,
    openThisDropdown: vi.fn(),
    actualCloseDropdown: vi.fn(),
    ...overrides,
  };
};

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('useDropdownEffects', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });

    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  it('handles hover-to-open and leave-intent close timers', () => {
    const props = createProps();

    const { result, rerender } = renderHook(
      (hookProps: Parameters<typeof useDropdownEffects>[0]) =>
        useDropdownEffects(hookProps),
      { initialProps: props }
    );

    act(() => {
      result.current.handleTriggerAreaEnter();
    });
    advance(100);

    expect(props.openThisDropdown).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleTriggerAreaEnter();
      result.current.handleMenuEnter();
    });
    advance(100);

    expect(props.openThisDropdown).toHaveBeenCalledTimes(1);

    const openProps = createProps({ ...props, isOpen: true });
    rerender(openProps);

    act(() => {
      result.current.handleMouseLeaveWithCloseIntent();
    });
    advance(200);

    expect(openProps.actualCloseDropdown).toHaveBeenCalledTimes(1);

    const closingProps = createProps({
      ...props,
      isClosing: true,
      openThisDropdown: vi.fn(),
    });
    rerender(closingProps);

    act(() => {
      result.current.handleTriggerAreaEnter();
    });
    advance(100);

    expect(closingProps.openThisDropdown).not.toHaveBeenCalled();
  });

  it('applies open effects, event listeners, and close reset flow', () => {
    const props = createProps({ isOpen: true });

    const { rerender } = renderHook(
      (hookProps: Parameters<typeof useDropdownEffects>[0]) =>
        useDropdownEffects(hookProps),
      { initialProps: props }
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(props.calculateDropdownPosition).toHaveBeenCalled();
    expect(props.manageFocusOnOpen).toHaveBeenCalled();
    expect(props.setApplyOpenStyles).toHaveBeenCalledWith(true);

    expect(window.addEventListener).toHaveBeenCalledWith(
      'scroll',
      props.calculateDropdownPosition,
      true
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      props.calculateDropdownPosition,
      false
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'focusout',
      props.handleFocusOut,
      false
    );

    const closedProps = createProps({ ...props, isOpen: false });
    rerender(closedProps);

    expect(document.body.style.overflow).toBe('');
    expect(closedProps.setApplyOpenStyles).toHaveBeenCalledWith(false);
    expect(closedProps.resetPosition).toHaveBeenCalled();
    expect(closedProps.resetSearch).toHaveBeenCalled();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      props.calculateDropdownPosition,
      true
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'resize',
      props.calculateDropdownPosition,
      false
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'focusout',
      props.handleFocusOut,
      false
    );
  });

  it('recalculates position when open styles are active and options change', () => {
    const props = createProps({ isOpen: true, applyOpenStyles: true });

    const { rerender } = renderHook(
      (hookProps: Parameters<typeof useDropdownEffects>[0]) =>
        useDropdownEffects(hookProps),
      { initialProps: props }
    );

    const beforeCount = props.calculateDropdownPosition.mock.calls.length;

    rerender(
      createProps({
        ...props,
        filteredOptions: [{ id: 'opt-3', name: 'Cetirizine' }],
      })
    );

    expect(props.calculateDropdownPosition.mock.calls.length).toBeGreaterThan(
      beforeCount
    );
  });
});
