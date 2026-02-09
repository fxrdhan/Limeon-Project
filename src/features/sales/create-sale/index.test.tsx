import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CreateSalePage from './index';

describe('CreateSalePage', () => {
  it('renders coming soon content', () => {
    render(<CreateSalePage />);

    expect(screen.getByText('Tambah Penjualan')).toBeInTheDocument();
    expect(
      screen.getByText('Fitur ini akan segera hadir!')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Halaman ini sedang dalam pengembangan.')
    ).toBeInTheDocument();
  });
});
