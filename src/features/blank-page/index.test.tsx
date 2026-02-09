import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComingSoon from './index';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('ComingSoon', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders defaults and navigates back when button is clicked', () => {
    render(<ComingSoon title="Dashboard Analytics" />);

    expect(screen.getByText('Dashboard Analytics')).toBeInTheDocument();
    expect(screen.getByText('Sedang dalam pengembangan')).toBeInTheDocument();
    expect(screen.getByText('Dalam Pengembangan')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Fitur ini akan segera tersedia dalam pembaruan mendatang'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /kembali/i }));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders optional description and custom status text while hiding back button', () => {
    render(
      <ComingSoon
        title="Inventory AI"
        description="Modul prediksi stok sedang dibangun."
        showBackButton={false}
        statusText="Beta Internal"
        statusDescription="Hanya tersedia untuk tim QA."
      />
    );

    expect(
      screen.getByText('Modul prediksi stok sedang dibangun.')
    ).toBeInTheDocument();
    expect(screen.getByText('Beta Internal')).toBeInTheDocument();
    expect(
      screen.getByText('Hanya tersedia untuk tim QA.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /kembali/i })
    ).not.toBeInTheDocument();
  });
});
