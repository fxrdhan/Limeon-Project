import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageTitle from './index';

describe('PageTitle', () => {
  it('renders title text with heading styles', () => {
    render(<PageTitle title="Master Data" />);

    const title = screen.getByRole('heading', { name: 'Master Data' });
    expect(title).toHaveClass('text-2xl!', 'font-semibold', 'text-center');
  });
});
