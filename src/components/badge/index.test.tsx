import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Badge from './index';

describe('Badge', () => {
  it('renders with default variant and size', () => {
    render(<Badge>Default badge</Badge>);

    const badge = screen.getByText('Default badge');
    expect(badge).toHaveClass('bg-blue-100');
    expect(badge).toHaveClass('text-blue-800');
    expect(badge).toHaveClass('px-3');
    expect(badge).toHaveClass('py-1.5');
  });

  it('renders icon, animation, and custom classes', () => {
    render(
      <Badge
        variant="success"
        size="lg"
        animate
        className="custom-badge"
        icon={<span data-testid="badge-icon">i</span>}
      >
        Success badge
      </Badge>
    );

    const badge = screen.getByText('Success badge');
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-emerald-100');
    expect(badge).toHaveClass('text-emerald-800');
    expect(badge).toHaveClass('px-4');
    expect(badge).toHaveClass('py-2');
    expect(badge).toHaveClass('animate-pulse');
    expect(badge).toHaveClass('custom-badge');
  });
});
