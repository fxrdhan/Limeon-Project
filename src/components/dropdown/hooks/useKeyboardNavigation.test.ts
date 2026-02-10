import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_STATES } from '../constants';
import { useKeyboardNavigation } from './useKeyboardNavigation';

type DropdownKeyEvent = Parameters<
  ReturnType<typeof useKeyboardNavigation>['handleDropdownKeyDown']
>[0];

const createKeyboardEvent = (key: string, shiftKey = false) =>
  ({
    key,
    shiftKey,
    preventDefault: vi.fn(),
  }) as unknown as DropdownKeyEvent;

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });
  });

  it('auto-highlights selected value when opened', async () => {
    const setExpandedId = vi.fn();
    const optionsContainerRef = { current: document.createElement('div') };

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        value: 'b',
        currentFilteredOptions: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        setExpandedId,
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        optionsContainerRef,
      })
    );

    await flushMicrotasks();

    expect(result.current.highlightedIndex).toBe(1);
    expect(setExpandedId).toHaveBeenCalledWith('b');
  });

  it('handles arrow navigation and enter selection', async () => {
    const onSelect = vi.fn();
    const setExpandedId = vi.fn();
    const optionsContainer = document.createElement('div');
    const optionA = document.createElement('div');
    optionA.setAttribute('role', 'option');
    const optionB = document.createElement('div');
    optionB.setAttribute('role', 'option');
    optionsContainer.append(optionA, optionB);

    const scrollIntoViewSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewSpy,
    });

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        setExpandedId,
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect,
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: optionsContainer },
      })
    );

    await flushMicrotasks();

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('ArrowDown'));
    });

    expect(result.current.isKeyboardNavigation).toBe(true);
    expect(result.current.highlightedIndex).toBe(1);
    expect(setExpandedId).toHaveBeenCalledWith('b');
    expect(scrollIntoViewSpy).toHaveBeenCalled();

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('Enter'));
    });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('supports add-new flow when no result on enter', () => {
    const onAddNew = vi.fn();
    const onCloseDropdown = vi.fn();
    const onCloseValidation = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [],
        setExpandedId: vi.fn(),
        searchState: SEARCH_STATES.NOT_FOUND,
        searchTerm: 'New item',
        onSelect: vi.fn(),
        onAddNew,
        onCloseDropdown,
        onCloseValidation,
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('Enter'));
    });

    expect(onCloseValidation).toHaveBeenCalled();
    expect(onAddNew).toHaveBeenCalledWith('New item');
    expect(onCloseDropdown).toHaveBeenCalled();
  });

  it('handles escape and tab/page navigation keys', () => {
    const onCloseDropdown = vi.fn();
    const setExpandedId = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        setExpandedId,
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown,
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('Tab'));
      result.current.handleDropdownKeyDown(createKeyboardEvent('PageDown'));
      result.current.handleDropdownKeyDown(createKeyboardEvent('PageUp'));
      result.current.handleDropdownKeyDown(createKeyboardEvent('Escape'));
    });

    expect(onCloseDropdown).toHaveBeenCalled();
    expect(setExpandedId).toHaveBeenCalledWith(null);
  });

  it('exits keyboard navigation mode on significant mouse movement', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        setExpandedId: vi.fn(),
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('ArrowDown'));
    });
    expect(result.current.isKeyboardNavigation).toBe(true);

    act(() => {
      document.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 40, clientY: 40 })
      );
      vi.advanceTimersByTime(60);
    });

    expect(result.current.isKeyboardNavigation).toBe(false);
  });

  it('resets highlight and keyboard mode after dropdown closes', async () => {
    const setExpandedId = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) =>
        useKeyboardNavigation({
          isOpen,
          currentFilteredOptions: [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
          ],
          setExpandedId,
          searchState: SEARCH_STATES.IDLE,
          searchTerm: '',
          onSelect: vi.fn(),
          onCloseDropdown: vi.fn(),
          onCloseValidation: vi.fn(),
          optionsContainerRef: { current: document.createElement('div') },
        }),
      { initialProps: { isOpen: true } }
    );

    await flushMicrotasks();

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('ArrowDown'));
    });

    expect(result.current.isKeyboardNavigation).toBe(true);
    expect(result.current.highlightedIndex).toBe(1);

    rerender({ isOpen: false });
    await flushMicrotasks();

    expect(result.current.isKeyboardNavigation).toBe(false);
    expect(result.current.highlightedIndex).toBe(-1);
  });

  it('auto-highlights first option when opened without value', async () => {
    const setExpandedId = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        setExpandedId,
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    await flushMicrotasks();

    expect(result.current.highlightedIndex).toBe(0);
    expect(setExpandedId).toHaveBeenCalledWith('a');
  });

  it('does not auto-highlight on open when feature is disabled', async () => {
    const setExpandedId = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        setExpandedId,
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: document.createElement('div') },
        autoHighlightOnOpen: false,
      })
    );

    await flushMicrotasks();

    expect(result.current.highlightedIndex).toBe(-1);
    expect(setExpandedId).not.toHaveBeenCalled();
  });

  it('ignores unsupported keys when there are no options', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [],
        setExpandedId: vi.fn(),
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown: vi.fn(),
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    const event = createKeyboardEvent('ArrowDown');

    act(() => {
      result.current.handleDropdownKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(result.current.highlightedIndex).toBe(-1);
  });

  it('ignores keyboard handling while dropdown is closed', () => {
    const onCloseDropdown = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: false,
        currentFilteredOptions: [{ id: 'a', name: 'A' }],
        setExpandedId: vi.fn(),
        searchState: SEARCH_STATES.IDLE,
        searchTerm: '',
        onSelect: vi.fn(),
        onCloseDropdown,
        onCloseValidation: vi.fn(),
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    const event = createKeyboardEvent('Escape');

    act(() => {
      result.current.handleDropdownKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onCloseDropdown).not.toHaveBeenCalled();
  });

  it('does not trigger add-new for blank search terms', () => {
    const onAddNew = vi.fn();
    const onCloseDropdown = vi.fn();
    const onCloseValidation = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        currentFilteredOptions: [],
        setExpandedId: vi.fn(),
        searchState: SEARCH_STATES.NOT_FOUND,
        searchTerm: '   ',
        onSelect: vi.fn(),
        onAddNew,
        onCloseDropdown,
        onCloseValidation,
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    act(() => {
      result.current.handleDropdownKeyDown(createKeyboardEvent('Enter'));
    });

    expect(onAddNew).not.toHaveBeenCalled();
    expect(onCloseDropdown).not.toHaveBeenCalled();
    expect(onCloseValidation).not.toHaveBeenCalled();
  });
});
