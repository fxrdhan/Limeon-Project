import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import SearchInput from './SearchInput';

describe('SearchInput', () => {
  it('updates aria state and applies not-found error style', () => {
    const onSearchChange = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <SearchInput
        ref={React.createRef<HTMLInputElement>()}
        searchTerm="abc"
        searchState="not-found"
        isOpen={true}
        highlightedIndex={0}
        currentFilteredOptions={[{ id: 'option-1', name: 'Option 1' }]}
        onSearchChange={onSearchChange}
        onKeyDown={onKeyDown}
        onFocus={vi.fn()}
        leaveTimeoutRef={{ current: null }}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-danger');
    expect(input).toHaveAttribute('data-open', 'true');
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      'dropdown-option-option-1'
    );

    fireEvent.change(input, { target: { value: 'abcd' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('clears leave timeout and stops click propagation on focus', () => {
    const onFocus = vi.fn();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const parentClick = vi.fn();

    const timeout = setTimeout(() => {}, 10);
    const leaveTimeoutRef = {
      current: timeout,
    } as React.RefObject<NodeJS.Timeout | null>;

    render(
      <div onClick={parentClick}>
        <SearchInput
          ref={React.createRef<HTMLInputElement>()}
          searchTerm=""
          searchState="idle"
          isOpen={false}
          highlightedIndex={-1}
          currentFilteredOptions={[]}
          onSearchChange={vi.fn()}
          onKeyDown={vi.fn()}
          onFocus={onFocus}
          leaveTimeoutRef={leaveTimeoutRef}
        />
      </div>
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.click(input);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout);
    expect(leaveTimeoutRef.current).toBeNull();
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
