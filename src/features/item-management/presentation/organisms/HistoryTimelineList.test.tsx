import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HistoryTimelineList, { type HistoryItem } from './HistoryTimelineList';

vi.mock('motion/react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    react.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        react.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      react.createElement(react.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
    useIsPresent: () => true,
  };
});

vi.mock('@/lib/formatters', () => ({
  formatDateTime: vi.fn(() => 'formatted-date'),
}));

const historyItems: HistoryItem[] = [
  {
    id: 'h1',
    version_number: 1,
    action_type: 'INSERT',
    changed_at: '2026-01-01T10:00:00.000Z',
    changed_fields: { name: 'old' },
  },
  {
    id: 'h2',
    version_number: 2,
    action_type: 'UPDATE',
    changed_at: '2026-01-02T10:00:00.000Z',
    changed_fields: { stock: 10 },
  },
  {
    id: 'h3',
    version_number: 3,
    action_type: 'DELETE',
    changed_at: '2026-01-03T10:00:00.000Z',
  },
];

const baseProps = () => ({
  history: historyItems,
  isLoading: false,
  onVersionClick: vi.fn(),
});

describe('HistoryTimelineList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading and empty states when no history data exists', () => {
    const { rerender } = render(
      <HistoryTimelineList
        history={null}
        isLoading={true}
        onVersionClick={vi.fn()}
        loadingMessage="Memuat..."
      />
    );

    expect(screen.getByText('Memuat...')).toBeInTheDocument();

    rerender(
      <HistoryTimelineList
        history={[]}
        isLoading={false}
        onVersionClick={vi.fn()}
        emptyMessage="Tidak ada riwayat"
      />
    );

    expect(screen.getByText('Tidak ada riwayat')).toBeInTheDocument();
  });

  it('handles single-selection click and restore action without triggering row click', () => {
    const onVersionClick = vi.fn();
    const onRestore = vi.fn();

    const { container } = render(
      <HistoryTimelineList
        {...baseProps()}
        onVersionClick={onVersionClick}
        selectedVersion={2}
        selectedVersions={[1]}
        showRestoreButton={true}
        onRestore={onRestore}
      />
    );

    const selectedSingle = container.querySelector(
      '[data-version-number="2"] .ml-6'
    );
    expect(selectedSingle?.className).toContain('bg-green-50');

    const selectedMulti = container.querySelector(
      '[data-version-number="1"] .ml-6'
    );
    expect(selectedMulti?.className).toContain('bg-blue-50');

    fireEvent.click(screen.getAllByTitle('Restore ke versi ini')[0]);

    expect(onRestore).toHaveBeenCalledWith(1);
    expect(onVersionClick).not.toHaveBeenCalled();

    fireEvent.click(
      container.querySelector('[data-version-number="3"] .ml-6')!
    );
    expect(onVersionClick).toHaveBeenCalledWith(historyItems[2]);
  });

  it('supports multi-select add remove and replace flow with compare callbacks', () => {
    const onVersionClick = vi.fn();
    const onCompareSelected = vi.fn();
    const onSelectionEmpty = vi.fn();

    const { container } = render(
      <HistoryTimelineList
        {...baseProps()}
        onVersionClick={onVersionClick}
        allowMultiSelect={true}
        onCompareSelected={onCompareSelected}
        onSelectionEmpty={onSelectionEmpty}
        maxSelections={2}
      />
    );

    const clickCard = (version: number) => {
      fireEvent.click(
        container.querySelector(`[data-version-number="${version}"] .ml-6`)!
      );
    };

    clickCard(1);
    clickCard(2);
    clickCard(3);

    expect(onCompareSelected).toHaveBeenNthCalledWith(1, [historyItems[0]]);
    expect(onCompareSelected).toHaveBeenNthCalledWith(2, [
      historyItems[0],
      historyItems[1],
    ]);
    expect(onCompareSelected).toHaveBeenNthCalledWith(3, [
      historyItems[1],
      historyItems[2],
    ]);

    clickCard(2);
    expect(onCompareSelected).toHaveBeenNthCalledWith(4, [historyItems[2]]);

    clickCard(3);
    expect(onSelectionEmpty).toHaveBeenCalledTimes(1);
    expect(onVersionClick).not.toHaveBeenCalled();
  });

  it('auto-scrolls to selected version and renders changed fields detail when selected', () => {
    vi.useFakeTimers();

    const scrollToMock = vi.fn();

    const { container } = render(
      <HistoryTimelineList
        {...baseProps()}
        selectedVersion={2}
        autoScrollToSelected={true}
        skipEntranceAnimation={true}
      />
    );

    const scrollContainer = container.querySelector(
      '.history-scrollbar-hidden'
    ) as HTMLDivElement;

    Object.defineProperty(scrollContainer, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      configurable: true,
      value: 800,
    });
    scrollContainer.scrollTo = scrollToMock;

    const versionElement = container.querySelector(
      '[data-version-number="2"]'
    ) as HTMLElement;
    Object.defineProperty(versionElement, 'offsetTop', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(versionElement, 'offsetHeight', {
      configurable: true,
      value: 40,
    });

    vi.runAllTimers();

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('Changed fields:').length).toBeGreaterThan(0);

    vi.useRealTimers();
  });

  it('shows multi-select flipped color classes for selected cards', () => {
    const { container } = render(
      <HistoryTimelineList
        {...baseProps()}
        allowMultiSelect={true}
        selectedVersions={[1, 2]}
        isFlipped={true}
      />
    );

    fireEvent.click(
      container.querySelector('[data-version-number="1"] .ml-6')!
    );
    fireEvent.click(
      container.querySelector('[data-version-number="2"] .ml-6')!
    );

    const first = container.querySelector('[data-version-number="1"] .ml-6');
    const second = container.querySelector('[data-version-number="2"] .ml-6');

    expect(first?.className).toContain('bg-purple-50');
    expect(second?.className).toContain('bg-blue-50');
  });
});
