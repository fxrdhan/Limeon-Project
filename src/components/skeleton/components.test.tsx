import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import ButtonSkeleton from './ButtonSkeleton';
import CardSkeleton from './CardSkeleton';
import FormSkeleton from './FormSkeleton';
import Skeleton from './Skeleton';
import SkeletonText from './SkeletonText';
import StatCardSkeleton from './StatCardSkeleton';
import TableSkeleton from './TableSkeleton';

vi.mock('@/components/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="mock-card" className={className}>
      {children}
    </div>
  ),
}));

describe('skeleton components', () => {
  it('renders Skeleton with style and class modifiers', () => {
    const { rerender } = render(
      <Skeleton width={120} height="40px" rounded={false} animate={false} />
    );

    const base = document.querySelector('.bg-slate-200');
    expect(base).toHaveStyle({ width: '120px', height: '40px' });
    expect(base).not.toHaveClass('rounded');
    expect(base).not.toHaveClass('animate-pulse');

    rerender(<Skeleton className="extra-class" />);
    expect(document.querySelector('.extra-class')).toBeInTheDocument();
  });

  it('renders SkeletonText single and multiline variants', () => {
    const { rerender } = render(<SkeletonText lines={1} />);
    expect(document.querySelectorAll('.h-4')).toHaveLength(1);

    rerender(<SkeletonText lines={3} className="stack" animate={false} />);
    expect(document.querySelector('.stack')).toBeInTheDocument();
    expect(document.querySelectorAll('.h-4')).toHaveLength(3);
    expect(document.querySelector('.w-3\\/4')).toBeInTheDocument();
  });

  it('renders TableSkeleton layout and optional pagination', () => {
    const { rerender } = render(
      <TableSkeleton rows={2} columns={3} showPagination={false} />
    );

    expect(
      document.querySelectorAll('.border-b.border-slate-200')
    ).toHaveLength(2);
    expect(document.querySelectorAll('.h-8.w-8')).toHaveLength(0);

    rerender(<TableSkeleton rows={1} columns={2} showPagination={true} />);
    expect(document.querySelectorAll('.h-8.w-8')).toHaveLength(5);
  });

  it('renders FormSkeleton, CardSkeleton, ButtonSkeleton and StatCardSkeleton variants', () => {
    const { rerender } = render(
      <FormSkeleton fields={2} showTitle={false} showButtons={false} />
    );

    expect(screen.getAllByTestId('mock-card')).toHaveLength(1);
    expect(document.querySelectorAll('.space-y-2')).toHaveLength(2);

    rerender(<CardSkeleton showHeader={false} showBody={false} />);
    expect(document.querySelectorAll('.space-y-3')).toHaveLength(0);

    rerender(<ButtonSkeleton width="88px" height="30px" animate={false} />);
    const buttonSkel = document.querySelector('.rounded-lg');
    expect(buttonSkel).toHaveStyle({ width: '88px', height: '30px' });

    rerender(<StatCardSkeleton className="stat-card" />);
    expect(document.querySelector('.stat-card')).toBeInTheDocument();
  });
});
