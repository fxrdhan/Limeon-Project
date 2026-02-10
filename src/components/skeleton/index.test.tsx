import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ButtonSkeleton,
  CardSkeleton,
  FormSkeleton,
  Skeleton,
  TableSkeleton,
  SkeletonText,
  StatCardSkeleton,
} from './index';

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

  it('renders table skeleton wrapper with provided dimensions', () => {
    const { container, rerender } = render(
      <TableSkeleton rows={2} columns={3} className="table-skeleton" />
    );

    expect(container.querySelector('.table-skeleton')).toBeInTheDocument();
    expect(container.querySelectorAll('.border-b')).toHaveLength(2);

    rerender(
      <TableSkeleton
        rows={1}
        columns={2}
        showPagination={false}
        className="table-no-pagination"
      />
    );
    expect(container.querySelector('.table-no-pagination')).toBeInTheDocument();
    expect(container.querySelector('.justify-between')).not.toBeInTheDocument();
  });

  it('renders card, stat card, button, and form variants across options', () => {
    const { container, rerender } = render(
      <CardSkeleton className="card-skeleton" bodyLines={2} />
    );
    expect(container.querySelector('.card-skeleton')).toBeInTheDocument();
    expect(
      container.querySelectorAll('.space-y-3 .h-4').length
    ).toBeGreaterThan(1);

    rerender(
      <CardSkeleton showHeader={false} showBody={false} className="empty" />
    );
    expect(container.querySelector('.empty')).toBeInTheDocument();
    expect(container.querySelector('.space-y-3')).not.toBeInTheDocument();

    rerender(<StatCardSkeleton className="stat-skeleton" />);
    expect(container.querySelector('.stat-skeleton')).toBeInTheDocument();

    rerender(<ButtonSkeleton width="80px" height="32px" className="btn-sm" />);
    const smallButton = container.querySelector('.btn-sm') as HTMLDivElement;
    expect(smallButton).toBeInTheDocument();
    expect(smallButton.style.width).toBe('80px');
    expect(smallButton.style.height).toBe('32px');

    rerender(<ButtonSkeleton width="128px" height="48px" className="btn-lg" />);
    const largeButton = container.querySelector('.btn-lg') as HTMLDivElement;
    expect(largeButton).toBeInTheDocument();
    expect(largeButton.style.width).toBe('128px');
    expect(largeButton.style.height).toBe('48px');

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
