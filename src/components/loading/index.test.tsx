import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from './index';

describe('Loading', () => {
  it('renders spinner and custom message/className', () => {
    const { container } = render(
      <Loading className="custom-loading" message="Memuat data" />
    );

    expect(container.firstElementChild).toHaveClass('custom-loading');
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText('Memuat data')).toBeInTheDocument();
  });

  it('renders empty message by default', () => {
    const { container } = render(<Loading />);

    const message = container.querySelector('p');
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent('');
  });
});
