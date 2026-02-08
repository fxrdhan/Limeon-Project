import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ItemListTemplate from './ItemListTemplate';

vi.mock('@/components/card', () => ({
  Card: ({
    className,
    children,
  }: {
    className?: string;
    children: ReactNode;
  }) => (
    <section data-testid="card" data-class-name={className || ''}>
      {children}
    </section>
  ),
}));

vi.mock('@/components/page-title', () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

describe('ItemListTemplate', () => {
  it('renders title, toolbar, table and modal slot', () => {
    render(
      <ItemListTemplate
        searchToolbar={<div data-testid="toolbar">toolbar</div>}
        dataTable={<div data-testid="datatable">datatable</div>}
        modal={<div data-testid="modal">modal</div>}
      />
    );

    expect(screen.getByText('Daftar Item')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('datatable')).toBeInTheDocument();
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    expect(screen.getByTestId('card').getAttribute('data-class-name')).toBe(
      'flex-1 flex flex-col'
    );
  });

  it('applies loading class variants when isLoading is true', () => {
    render(
      <ItemListTemplate
        isLoading={true}
        searchToolbar={<div>toolbar</div>}
        dataTable={<div>datatable</div>}
      />
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('card').getAttribute('data-class-name')).toBe(
      'opacity-75 transition-opacity duration-300 flex-1 flex flex-col'
    );
  });
});
