import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CategoryListSkeleton,
  ItemListSkeleton,
  PatientListSkeleton,
  PurchaseListSkeleton,
  SkeletonTable,
  SkeletonTableCell,
  SkeletonTableRow,
  SupplierListSkeleton,
  TypeListSkeleton,
  UnitListSkeleton,
} from './skeleton';

describe('table skeletons', () => {
  it('renders cell and row primitives with configured widths/classes', () => {
    const { container, rerender } = render(
      <table>
        <tbody>
          <tr>
            <SkeletonTableCell className="custom-cell" width="42%" />
          </tr>
        </tbody>
      </table>
    );

    expect(container.querySelector('td.custom-cell')).toBeInTheDocument();
    const pulse = container.querySelector('.animate-pulse') as HTMLDivElement;
    expect(pulse.style.width).toBe('42%');

    rerender(
      <table>
        <tbody>
          <SkeletonTableRow
            className="custom-row"
            columns={[
              { width: '50%' },
              { width: '60%' },
              { width: '70%', className: 'text-right' },
            ]}
          />
        </tbody>
      </table>
    );

    expect(container.querySelector('tr.custom-row')).toBeInTheDocument();
    expect(container.querySelectorAll('td')).toHaveLength(3);
  });

  it('renders generic skeleton table headers and row count', () => {
    const { container } = render(
      <SkeletonTable
        className="generic-skeleton-table"
        headers={[
          { title: 'Header A' },
          { title: 'Header B', className: 'text-right' },
        ]}
        columns={[{ width: '80%' }, { width: '60%' }]}
        rows={3}
      />
    );

    expect(screen.getByText('Header A')).toBeInTheDocument();
    expect(screen.getByText('Header B').closest('th')).toHaveClass(
      'text-right'
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(
      container.querySelector('.generic-skeleton-table')
    ).toBeInTheDocument();
  });

  it('renders all preconfigured skeleton variants', () => {
    const { container, rerender } = render(<ItemListSkeleton rows={2} />);
    expect(screen.getByText('Nama Item')).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);

    rerender(<CategoryListSkeleton rows={3} />);
    expect(screen.getByText('Nama Kategori')).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);

    rerender(<UnitListSkeleton rows={4} />);
    expect(screen.getByText('Nama Kemasan')).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(4);

    rerender(<TypeListSkeleton rows={2} />);
    expect(screen.getByText('Nama Jenis')).toBeInTheDocument();

    rerender(<SupplierListSkeleton rows={2} />);
    expect(screen.getByText('Nama Supplier')).toBeInTheDocument();

    rerender(<PatientListSkeleton rows={2} />);
    expect(screen.getByText('Nama Pasien')).toBeInTheDocument();

    rerender(<PurchaseListSkeleton rows={2} />);
    expect(screen.getByText('No. Invoice')).toBeInTheDocument();
  });
});
