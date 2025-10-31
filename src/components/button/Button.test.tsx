/**
 * Button Component Tests
 *
 * Comprehensive test suite for the Button component.
 * Tests variants, sizes, loading states, and accessibility.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import Button from './index';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click me</Button>);

      expect(
        screen.getByRole('button', { name: /click me/i })
      ).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<Button>Test</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Test</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('button'); // Should still have base class
    });
  });

  describe('Variants', () => {
    it('should render with primary variant by default', () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--primary');
    });

    it('should render with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--secondary');
    });

    it('should render with danger variant', () => {
      render(<Button variant="danger">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--danger');
    });

    it('should render with text variant', () => {
      render(<Button variant="text">Text</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--text');
    });

    it('should render with text-danger variant', () => {
      render(<Button variant="text-danger">Cancel</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--text-danger');
    });
  });

  describe('Sizes', () => {
    it('should render with medium size by default', () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--md');
    });

    it('should render with small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--sm');
    });

    it('should render with large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--lg');
    });
  });

  describe('Loading State', () => {
    it('should show loading text when isLoading is true', () => {
      render(<Button isLoading>Save</Button>);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('should show spinner icon when loading', () => {
      render(<Button isLoading>Save</Button>);

      const spinner = document.querySelector('.button__spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should be disabled when isLoading is true', () => {
      render(<Button isLoading>Save</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button isLoading onClick={handleClick}>
          Save
        </Button>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole('button'));

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
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Press me</Button>);

      const button = screen.getByRole('button');

      // Tab to focus
      await user.tab();
      expect(button).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('should trigger with Space key', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Press me</Button>);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('States and Props', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply fullWidth class', () => {
      render(<Button fullWidth>Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--fullwidth');
    });

    it('should apply glow class when withGlow is true', () => {
      render(<Button withGlow>Glowing</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--glow');
    });

    it('should apply underline class for text variant with withUnderline', () => {
      render(
        <Button variant="text" withUnderline>
          Text
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--underline');
    });

    it('should not apply underline class for non-text variant', () => {
      render(
        <Button variant="primary" withUnderline>
          Primary
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('button--underline');
    });
  });

  describe('Accessibility', () => {
    it('should have correct button type', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);

      const button = screen.getByRole('button', { name: /close dialog/i });
      expect(button).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="help-text">Submit</Button>
          <span id="help-text">This will submit the form</span>
        </>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should be focusable by default', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', () => {
      render(<Button disabled>Not Focusable</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      // Disabled buttons cannot receive focus
    });
  });

  describe('Edge Cases', () => {
    it('should handle children as JSX elements', () => {
      render(
        <Button>
          <span data-testid="icon">→</span> Next
        </Button>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should handle multiple rapid clicks', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click</Button>);

      const button = screen.getByRole('button');

      // Rapid clicks
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();

      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Ref Button');
    });

    it('should spread additional props', () => {
      render(
        <Button data-testid="custom-button" data-custom="value">
          Test
        </Button>
      );

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('Runtime Validation (Development)', () => {
    const originalEnv = process.env.NODE_ENV;
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      consoleWarn.mockClear();
    });

    it('should warn about invalid variant in development', () => {
      process.env.NODE_ENV = 'development';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<Button variant={'invalid' as any}>Test</Button>);

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid variant')
      );
    });

    it('should warn about invalid size in development', () => {
      process.env.NODE_ENV = 'development';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<Button size={'invalid' as any}>Test</Button>);

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid size')
      );
    });

    it('should use fallback variant when invalid', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<Button variant={'invalid' as any}>Test</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--primary'); // Fallback to primary
    });

    it('should use fallback size when invalid', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<Button size={'invalid' as any}>Test</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button--md'); // Fallback to md
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const handleClick = vi.fn();

      render(
        <Button
          variant="danger"
          size="lg"
          fullWidth
          withGlow
          onClick={handleClick}
          className="custom"
        >
          Delete All
        </Button>
      );

      const button = screen.getByRole('button');

      expect(button).toHaveClass('button');
      expect(button).toHaveClass('button--danger');
      expect(button).toHaveClass('button--lg');
      expect(button).toHaveClass('button--fullwidth');
      expect(button).toHaveClass('button--glow');
      expect(button).toHaveClass('custom');
    });

    it('should transition between loading and normal state', () => {
      const { rerender } = render(<Button>Save</Button>);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

      rerender(<Button isLoading>Save</Button>);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();

      rerender(<Button>Save</Button>);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});
