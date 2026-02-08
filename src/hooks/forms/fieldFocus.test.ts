import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFieldFocus } from './fieldFocus';

let rafQueue: FrameRequestCallback[] = [];

const flushRaf = () => {
  while (rafQueue.length > 0) {
    const callback = rafQueue.shift();
    callback?.(performance.now());
  }
};

describe('useFieldFocus', () => {
  beforeEach(() => {
    rafQueue = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(callback => {
        rafQueue.push(callback);
        return rafQueue.length;
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('focuses search input on mount when eligible', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const focusSpy = vi
      .spyOn(input, 'focus')
      .mockImplementation(() => undefined);

    renderHook(() =>
      useFieldFocus({
        searchInputRef: { current: input },
        isModalOpen: false,
        isLoading: false,
        isFetching: false,
      })
    );

    flushRaf();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does not focus when modal is open or loading/fetching', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const focusSpy = vi
      .spyOn(input, 'focus')
      .mockImplementation(() => undefined);

    renderHook(() =>
      useFieldFocus({
        searchInputRef: { current: input },
        isModalOpen: true,
        isLoading: true,
        isFetching: true,
      })
    );

    flushRaf();

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('re-focuses on non-interactive click and safe focusout transitions', () => {
    const input = document.createElement('input');
    const plainDiv = document.createElement('div');
    const button = document.createElement('button');
    const table = document.createElement('table');
    const tableInput = document.createElement('input');
    table.appendChild(tableInput);

    document.body.appendChild(input);
    document.body.appendChild(plainDiv);
    document.body.appendChild(button);
    document.body.appendChild(table);

    const focusSpy = vi
      .spyOn(input, 'focus')
      .mockImplementation(() => undefined);

    renderHook(() =>
      useFieldFocus({
        searchInputRef: { current: input },
      })
    );

    flushRaf();
    focusSpy.mockClear();

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushRaf();

    expect(focusSpy).not.toHaveBeenCalled();

    plainDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushRaf();

    expect(focusSpy).toHaveBeenCalledTimes(1);

    focusSpy.mockClear();
    document.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: button,
      })
    );
    flushRaf();
    expect(focusSpy).not.toHaveBeenCalled();

    document.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: tableInput,
      })
    );
    flushRaf();
    expect(focusSpy).not.toHaveBeenCalled();

    document.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: null,
      })
    );
    flushRaf();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});
