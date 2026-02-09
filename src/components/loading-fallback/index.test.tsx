import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  DashboardLoadingFallback,
  FormLoadingFallback,
  TableLoadingFallback,
} from './index';

const skeletonProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const skeletonTextProps = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);

vi.mock('@/components/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/page-title', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/skeleton', () => ({
  Skeleton: (props: Record<string, unknown>) => {
    skeletonProps.push(props);
    return <div data-testid="skeleton" />;
  },
  SkeletonText: (props: Record<string, unknown>) => {
    skeletonTextProps.push(props);
    return <div data-testid="skeleton-text" />;
  },
}));

describe('loading-fallback components', () => {
  it('renders table fallback with custom structure and optional sections', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const { rerender } = render(
      <TableLoadingFallback
        title="Master Data"
        showSearchBar={false}
        showButton={false}
        tableColumns={2}
        tableRows={3}
        showPagination={false}
      />
    );

    expect(screen.getByText('Master Data')).toBeInTheDocument();
    expect(document.querySelectorAll('thead th')).toHaveLength(2);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(3);

    rerender(<TableLoadingFallback />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.querySelectorAll('thead th')).toHaveLength(5);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(8);

    expect(skeletonProps.length).toBeGreaterThan(0);
    randomSpy.mockRestore();
  });

  it('renders dashboard fallback cards and recent activity skeleton rows', () => {
    render(<DashboardLoadingFallback />);

    expect(screen.getAllByTestId('skeleton-text')).toHaveLength(5);
    expect(skeletonTextProps[0]).toMatchObject({ lines: 2 });
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(10);
  });

  it('renders form fallback fields and action buttons', () => {
    render(<FormLoadingFallback />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(10);
  });
});
