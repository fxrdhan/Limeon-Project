import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import SearchBar from './SearchBar';

vi.mock('react-icons/tb', async importOriginal => {
  const actual = await importOriginal<typeof import('react-icons/tb')>();
  return {
    ...actual,
    TbArrowBack: (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid="tb-arrow-back" {...props} />
    ),
    TbSearch: (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid="tb-search" {...props} />
    ),
  };
});

describe('SearchBar', () => {
  it('renders with defaults and forwards input events', () => {
    const onChange = vi.fn();
    const onKeyDown = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );

    const input = screen.getByPlaceholderText('Cari...');
    fireEvent.change(input, { target: { value: 'aspirin' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.focus(input);
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('shows active layout and not-found styling when value exists', () => {
    render(
      <SearchBar
        value="ibuprofen"
        onChange={vi.fn()}
        searchState="not-found"
        placeholder="Cari obat"
      />
    );

    const input = screen.getByPlaceholderText('Cari obat');
    const icons = screen.getAllByTestId('tb-search');
    const arrow = screen.getByTestId('tb-arrow-back');
    const firstIconClass = icons[0].getAttribute('class') || '';
    const secondIconClass = icons[1].getAttribute('class') || '';
    const arrowClass = arrow.getAttribute('class') || '';

    expect(input.className).toContain('pl-3');
    expect(input.className).toContain('border-danger');
    expect(firstIconClass).toContain('opacity-100');
    expect(secondIconClass).toContain('opacity-0');
    expect(arrowClass).toContain('opacity-100');
  });

  it('uses state-based icon color classes', () => {
    const { rerender } = render(
      <SearchBar value="x" onChange={vi.fn()} searchState="found" />
    );

    let firstIconClass =
      screen.getAllByTestId('tb-search')[0].getAttribute('class') || '';
    expect(firstIconClass).toContain('text-primary');

    rerender(<SearchBar value="x" onChange={vi.fn()} searchState="typing" />);
    firstIconClass =
      screen.getAllByTestId('tb-search')[0].getAttribute('class') || '';
    expect(firstIconClass).toContain('text-slate-800');

    rerender(
      <SearchBar
        value="x"
        onChange={vi.fn()}
        searchState={'unexpected' as never}
      />
    );
    firstIconClass =
      screen.getAllByTestId('tb-search')[0].getAttribute('class') || '';
    expect(firstIconClass).toContain('text-slate-400');
  });
});
