import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ButtonSkeleton,
  CardSkeleton,
  FormSkeleton,
  Skeleton,
  SkeletonTable,
  SkeletonTableRow,
  SkeletonText,
  StatCardSkeleton,
} from './index.tsx';

describe('generic skeleton components', () => {
  it('renders base skeleton with custom style and class', () => {
    const { container } = render(
      <Skeleton className="base-skeleton" width="120px" height="32px" />
    );

    const node = container.querySelector('.base-skeleton') as HTMLDivElement;
    expect(node).toBeInTheDocument();
    expect(node.style.width).toBe('120px');
    expect(node.style.height).toBe('32px');
  });

  it('renders text skeleton in single-line and multi-line variants', () => {
    const { container, rerender } = render(<SkeletonText />);
    expect(container.querySelectorAll('.h-4')).toHaveLength(1);

    rerender(<SkeletonText lines={3} className="text-stack" />);
    expect(container.querySelector('.text-stack')).toBeInTheDocument();
    expect(container.querySelectorAll('.h-4')).toHaveLength(3);
    expect(container.querySelector('.w-3\\/4')).toBeInTheDocument();
  });

  it('renders table row and table wrappers with provided dimensions', () => {
    const { container, rerender } = render(
      <table>
        <tbody>
          <SkeletonTableRow columns={4} className="row-skeleton" />
        </tbody>
      </table>
    );

    expect(container.querySelector('tr.row-skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('td')).toHaveLength(4);

    rerender(<SkeletonTable rows={2} columns={3} className="table-skeleton" />);
    expect(container.querySelector('.table-skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('tr')).toHaveLength(2);
  });

  it('renders card, stat card, button, and form variants across options', () => {
    const { container, rerender } = render(
      <CardSkeleton className="card-skeleton" contentLines={2} />
    );
    expect(container.querySelector('.card-skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('.space-y-3 .h-4')).toHaveLength(2);

    rerender(
      <CardSkeleton showHeader={false} showContent={false} className="empty" />
    );
    expect(container.querySelector('.empty')).toBeInTheDocument();
    expect(container.querySelector('.space-y-3')).not.toBeInTheDocument();

    rerender(<StatCardSkeleton className="stat-skeleton" />);
    expect(container.querySelector('.stat-skeleton')).toBeInTheDocument();

    rerender(<ButtonSkeleton size="sm" className="btn-sm" />);
    expect(container.querySelector('.btn-sm')).toHaveClass('h-8', 'w-20');

    rerender(<ButtonSkeleton size="lg" className="btn-lg" />);
    expect(container.querySelector('.btn-lg')).toHaveClass('h-12', 'w-32');

    rerender(<FormSkeleton fields={2} showButtons={true} className="form-a" />);
    expect(container.querySelector('.form-a')).toBeInTheDocument();
    expect(container.querySelectorAll('.space-y-2')).toHaveLength(2);
    expect(container.querySelectorAll('.justify-end .rounded-lg')).toHaveLength(
      2
    );

    rerender(
      <FormSkeleton fields={1} showButtons={false} className="form-b" />
    );
    expect(container.querySelector('.form-b')).toBeInTheDocument();
    expect(container.querySelector('.justify-end')).not.toBeInTheDocument();
  });
});
