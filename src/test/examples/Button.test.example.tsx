/**
 * Example Component Test - Button
 *
 * This example demonstrates testing patterns for a typical button component.
 * Use this as a reference for writing your own component tests.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';

// Example Button component (replace with actual import)
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

// Mock component for example purposes
const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`btn btn-${variant} btn-${size}`}
    type={type}
    aria-busy={loading}
  >
    {loading ? 'Loading...' : children}
  </button>
);

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with text content', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply correct variant class', () => {
      render(<Button variant="danger">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-danger');
    });

    it('should apply correct size class', () => {
      render(<Button size="lg">Large Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-lg');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByText('Click me'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      const button = screen.getByRole('button');

      // Attempting to click disabled button
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('States', () => {
    it('should show loading text when loading', () => {
      render(<Button loading>Submit</Button>);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct button type', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');

      // Tab to focus
      await user.tab();
      expect(button).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid clicks', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');

      // Rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should handle children as JSX', () => {
      render(
        <Button>
          <span>Icon</span> Text
        </Button>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });
});
