import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlidingSelector } from './index';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');

  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    LayoutGroup: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

const options = [
  {
    key: 'tab-1',
    value: 1,
    defaultLabel: 'Tab One',
    activeLabel: 'Active One',
  },
  { key: 'tab-2', value: 2, defaultLabel: 'Tab Two' },
  { key: 'tab-3', value: 3, defaultLabel: 'Tab Three', disabled: true },
];

describe('SlidingSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders active label, handles click selection, and blocks disabled options', () => {
    const onSelectionChange = vi.fn();

    render(
      <SlidingSelector
        options={options}
        activeKey="tab-1"
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByText('Active One')).toBeInTheDocument();
    expect(screen.getByText('Tab Two')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tab Two' }));
    expect(onSelectionChange).toHaveBeenCalledWith(
      'tab-2',
      2,
      expect.any(Object)
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Tab Three' }));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('supports collapsed mode, toggle expand, and keyboard navigation controls', () => {
    const onSelectionChange = vi.fn();

    render(
      <SlidingSelector
        options={options}
        activeKey="tab-2"
        onSelectionChange={onSelectionChange}
        collapsible={true}
        defaultExpanded={false}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Expand tabs' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Tab One')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand tabs' }));
    expect(screen.getByText('Tab One')).toBeInTheDocument();

    const tabList = screen.getByRole('tablist');
    fireEvent.keyDown(tabList, { key: 'Tab' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Tab One' }), {
      key: 'Tab',
      shiftKey: true,
    });
    fireEvent.keyDown(tabList, { key: 'Tab', repeat: true });

    expect(onSelectionChange).toHaveBeenNthCalledWith(1, 'tab-1', 1);
    expect(onSelectionChange).toHaveBeenNthCalledWith(2, 'tab-2', 2);
    expect(onSelectionChange).toHaveBeenCalledTimes(2);

    act(() => {
      fireEvent.keyDown(screen.getByRole('tab', { name: 'Tab One' }), {
        key: 'Escape',
      });
    });
    expect(screen.queryByText('Tab One')).not.toBeInTheDocument();
  });

  it('handles hover expand and delayed auto-collapse with expanded state callback', () => {
    const onSelectionChange = vi.fn();
    const onExpandedChange = vi.fn();
    const focusSpy = vi.spyOn(HTMLButtonElement.prototype, 'focus');

    render(
      <SlidingSelector
        options={options}
        activeKey="tab-1"
        onSelectionChange={onSelectionChange}
        collapsible={true}
        defaultExpanded={false}
        expandOnHover={true}
        autoCollapseDelay={120}
        onExpandedChange={onExpandedChange}
      />
    );

    const tabList = screen.getByRole('tablist');
    fireEvent.mouseEnter(tabList);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(onExpandedChange).toHaveBeenCalledWith(true);

    fireEvent.mouseLeave(tabList);
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onExpandedChange).toHaveBeenCalledWith(false);
    focusSpy.mockRestore();
  });

  it('keeps options non-interactive when globally disabled', () => {
    const onSelectionChange = vi.fn();

    render(
      <SlidingSelector
        options={options}
        activeKey="tab-1"
        onSelectionChange={onSelectionChange}
        disabled={true}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Tab Two' }));
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Tab' });

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('covers hover leave blur/timeout cleanup and explicit-toggle focus behavior', () => {
    const onSelectionChange = vi.fn();
    const blurSpy = vi
      .spyOn(HTMLButtonElement.prototype, 'blur')
      .mockImplementation(() => undefined);
    const focusSpy = vi
      .spyOn(HTMLButtonElement.prototype, 'focus')
      .mockImplementation(() => undefined);

    const { unmount } = render(
      <SlidingSelector
        options={options}
        activeKey="tab-1"
        onSelectionChange={onSelectionChange}
        collapsible={true}
        defaultExpanded={true}
        expandOnHover={true}
        autoCollapseDelay={100}
      />
    );

    const tabList = screen.getByRole('tablist');
    const activeTab = screen.getByRole('tab', { name: 'Active One' });
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'activeElement'
    );
    Object.defineProperty(document, 'activeElement', {
      configurable: true,
      get: () => activeTab,
    });

    fireEvent.mouseLeave(tabList);
    expect(blurSpy).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(120);
    });

    fireEvent.mouseEnter(tabList);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    fireEvent.mouseEnter(tabList);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Unmount while timers are active to cover cleanup branch.
    unmount();

    render(
      <SlidingSelector
        options={options}
        activeKey="tab-2"
        onSelectionChange={onSelectionChange}
        collapsible={true}
        defaultExpanded={false}
        expandOnHover={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand tabs' }));
    act(() => {
      vi.runAllTimers();
    });
    expect(focusSpy).toHaveBeenCalled();

    // Collapsed active-tab click should still emit selection
    fireEvent.click(screen.getByRole('tab', { name: 'Tab Two' }));
    expect(onSelectionChange).toHaveBeenCalledWith(
      'tab-2',
      2,
      expect.any(Object)
    );

    blurSpy.mockRestore();
    focusSpy.mockRestore();
    if (activeElementDescriptor) {
      Object.defineProperty(document, 'activeElement', activeElementDescriptor);
    }
  });

  it('ignores repeated keydown events while expanded', () => {
    const onSelectionChange = vi.fn();
    render(
      <SlidingSelector
        options={options}
        activeKey="tab-1"
        onSelectionChange={onSelectionChange}
        collapsible={true}
        defaultExpanded={true}
      />
    );

    fireEvent.keyDown(screen.getByRole('tablist'), {
      key: 'Tab',
      repeat: true,
    });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
