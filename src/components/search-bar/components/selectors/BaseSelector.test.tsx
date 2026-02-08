import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseSelectorConfig } from '../../types';
import BaseSelector from './BaseSelector';

type Item = {
  id: string;
  label: string;
  description?: string;
  code?: string;
};

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: React.forwardRef<
      HTMLDivElement,
      React.HTMLAttributes<HTMLDivElement> & {
        initial?: unknown;
        animate?: unknown;
        exit?: unknown;
        transition?: unknown;
      }
    >(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
}));

const items: Item[] = [
  { id: 'a', label: 'Aspirin', description: 'Pain reliever', code: 'ASP' },
  { id: 'b', label: 'Ibuprofen', description: 'NSAID', code: 'IBU' },
];

const config: BaseSelectorConfig<Item> = {
  headerText: 'Pilih item',
  footerSingular: 'item',
  maxHeight: '320px',
  noResultsText: 'Tidak ada hasil untuk "{searchTerm}"',
  getItemKey: item => item.id,
  getItemLabel: item => item.label,
  getItemIcon: item => <span data-testid={`icon-${item.id}`}>icon</span>,
  getItemActiveColor: () => 'text-purple-500',
  getSearchFields: item => [
    { key: 'label', value: item.label, boost: 1000 },
    { key: 'code', value: item.code || '', boost: 500 },
  ],
  getItemDescription: item => item.description,
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('BaseSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders open state, supports keyboard navigation, and selects item', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const onHighlightChange = vi.fn();

    render(
      <BaseSelector
        items={items}
        isOpen
        onSelect={onSelect}
        onClose={onClose}
        position={{ top: 10, left: 20 }}
        config={config}
        onHighlightChange={onHighlightChange}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText('Pilih item')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onSelect).toHaveBeenCalledWith(items[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onHighlightChange).toHaveBeenCalledWith(items[0]);
  });

  it('uses defaultSelectedIndex on open and emits selected item on Enter', () => {
    const onSelect = vi.fn();

    render(
      <BaseSelector
        items={items}
        isOpen
        onSelect={onSelect}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
        config={config}
        defaultSelectedIndex={1}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it('captures internal search from keystrokes and supports backspace', () => {
    render(
      <BaseSelector
        items={items}
        isOpen
        onSelect={vi.fn()}
        onClose={vi.fn()}
        position={{ top: 0, left: 0 }}
        config={config}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    fireEvent.keyDown(document, { key: 'z' });
    expect(screen.getByText('No results for "z"')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Backspace' });
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
  });

  it('handles outside click and clears highlight when closed', () => {
    const onClose = vi.fn();
    const onHighlightChange = vi.fn();
    const { rerender } = render(
      <BaseSelector
        items={items}
        isOpen
        onSelect={vi.fn()}
        onClose={onClose}
        position={{ top: 0, left: 0 }}
        config={config}
        onHighlightChange={onHighlightChange}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();

    rerender(
      <BaseSelector
        items={items}
        isOpen={false}
        onSelect={vi.fn()}
        onClose={onClose}
        position={{ top: 0, left: 0 }}
        config={config}
        onHighlightChange={onHighlightChange}
      />
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(onHighlightChange).toHaveBeenCalledWith(null);
  });
});
