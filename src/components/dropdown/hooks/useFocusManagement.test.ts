import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DROPDOWN_CONSTANTS } from '../constants';
import { useFocusManagement } from './useFocusManagement';

describe('useFocusManagement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  it('focuses search input when dropdown opens in searchable mode', () => {
    const searchInput = document.createElement('input');
    document.body.appendChild(searchInput);
    const focusSpy = vi
      .spyOn(searchInput, 'focus')
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: true,
        touched: false,
        setTouched: vi.fn(),
        actualCloseDropdown: vi.fn(),
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: searchInput },
        optionsContainerRef: { current: document.createElement('div') },
      })
    );

    act(() => {
      result.current.manageFocusOnOpen();
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.SEARCH_FOCUS_DELAY);
    });

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('focuses options container in input mode without search list', () => {
    const optionsContainer = document.createElement('div');
    document.body.appendChild(optionsContainer);
    const focusSpy = vi
      .spyOn(optionsContainer, 'focus')
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: false,
        touched: false,
        setTouched: vi.fn(),
        actualCloseDropdown: vi.fn(),
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: document.createElement('input') },
        optionsContainerRef: { current: optionsContainer },
        mode: 'input',
      })
    );

    act(() => {
      result.current.manageFocusOnOpen();
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.FOCUS_DELAY);
    });

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown and marks touched when focus moves outside', () => {
    const setTouched = vi.fn();
    const actualCloseDropdown = vi.fn();

    const dropdown = document.createElement('div');
    const menu = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');

    dropdown.appendChild(inside);
    document.body.appendChild(dropdown);
    document.body.appendChild(menu);
    document.body.appendChild(outside);

    outside.focus();

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: false,
        touched: false,
        setTouched,
        actualCloseDropdown,
        dropdownRef: { current: dropdown },
        dropdownMenuRef: { current: menu },
        searchInputRef: { current: null },
        optionsContainerRef: { current: null },
      })
    );

    act(() => {
      result.current.handleFocusOut();
      vi.advanceTimersByTime(0);
    });

    expect(actualCloseDropdown).toHaveBeenCalledTimes(1);
    expect(setTouched).toHaveBeenCalledWith(true);
  });

  it('does nothing when focus remains inside dropdown tree', () => {
    const setTouched = vi.fn();
    const actualCloseDropdown = vi.fn();

    const dropdown = document.createElement('div');
    const inside = document.createElement('button');
    dropdown.appendChild(inside);
    document.body.appendChild(dropdown);
    inside.focus();

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: false,
        touched: true,
        setTouched,
        actualCloseDropdown,
        dropdownRef: { current: dropdown },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: null },
        optionsContainerRef: { current: null },
      })
    );

    act(() => {
      result.current.handleFocusOut();
      vi.advanceTimersByTime(0);
    });

    expect(actualCloseDropdown).not.toHaveBeenCalled();
    expect(setTouched).not.toHaveBeenCalled();
  });

  it('does not move focus when dropdown is closed', () => {
    const searchInput = document.createElement('input');
    const optionsContainer = document.createElement('div');
    const searchFocusSpy = vi
      .spyOn(searchInput, 'focus')
      .mockImplementation(() => {});
    const optionsFocusSpy = vi
      .spyOn(optionsContainer, 'focus')
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: false,
        searchList: true,
        touched: false,
        setTouched: vi.fn(),
        actualCloseDropdown: vi.fn(),
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: searchInput },
        optionsContainerRef: { current: optionsContainer },
        mode: 'input',
      })
    );

    act(() => {
      result.current.manageFocusOnOpen();
      vi.runAllTimers();
    });

    expect(searchFocusSpy).not.toHaveBeenCalled();
    expect(optionsFocusSpy).not.toHaveBeenCalled();
  });

  it('does not focus options container in non-input mode', () => {
    const optionsContainer = document.createElement('div');
    const focusSpy = vi
      .spyOn(optionsContainer, 'focus')
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: false,
        touched: false,
        setTouched: vi.fn(),
        actualCloseDropdown: vi.fn(),
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: null },
        optionsContainerRef: { current: optionsContainer },
        mode: 'text',
      })
    );

    act(() => {
      result.current.manageFocusOnOpen();
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.FOCUS_DELAY);
    });

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('marks touched without closing when already closed and focus moves outside', () => {
    const setTouched = vi.fn();
    const actualCloseDropdown = vi.fn();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: false,
        searchList: false,
        touched: false,
        setTouched,
        actualCloseDropdown,
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: null },
        optionsContainerRef: { current: null },
      })
    );

    act(() => {
      result.current.handleFocusOut();
      vi.advanceTimersByTime(0);
    });

    expect(actualCloseDropdown).not.toHaveBeenCalled();
    expect(setTouched).toHaveBeenCalledWith(true);
  });

  it('closes on outside focus without updating touched when already touched', () => {
    const setTouched = vi.fn();
    const actualCloseDropdown = vi.fn();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: false,
        touched: true,
        setTouched,
        actualCloseDropdown,
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: document.createElement('div') },
        searchInputRef: { current: null },
        optionsContainerRef: { current: null },
      })
    );

    act(() => {
      result.current.handleFocusOut();
      vi.advanceTimersByTime(0);
    });

    expect(actualCloseDropdown).toHaveBeenCalledTimes(1);
    expect(setTouched).not.toHaveBeenCalled();
  });

  it('treats focus inside dropdown menu as inside dropdown tree', () => {
    const setTouched = vi.fn();
    const actualCloseDropdown = vi.fn();
    const menu = document.createElement('div');
    const menuButton = document.createElement('button');
    menu.appendChild(menuButton);
    document.body.appendChild(menu);
    menuButton.focus();

    const { result } = renderHook(() =>
      useFocusManagement({
        isOpen: true,
        searchList: false,
        touched: false,
        setTouched,
        actualCloseDropdown,
        dropdownRef: { current: document.createElement('div') },
        dropdownMenuRef: { current: menu },
        searchInputRef: { current: null },
        optionsContainerRef: { current: null },
      })
    );

    act(() => {
      result.current.handleFocusOut();
      vi.advanceTimersByTime(0);
    });

    expect(actualCloseDropdown).not.toHaveBeenCalled();
    expect(setTouched).not.toHaveBeenCalled();
  });
});
