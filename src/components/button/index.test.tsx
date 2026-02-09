import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Button from './index';

describe('Button', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders default button styles and click handler', () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveClass('button', 'button--md', 'button--primary');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders loading state and disables interaction while loading', () => {
    const onClick = vi.fn();

    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>
    );

    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies variant-specific classes for text mode and optional modifiers', () => {
    render(
      <Button variant="text" withUnderline withGlow fullWidth>
        Detail
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Detail' });
    expect(button).toHaveClass(
      'button--text',
      'button--glow',
      'button--fullwidth',
      'button--underline'
    );
  });

  it('warns and falls back to safe variant and size in development', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <Button variant={'invalid' as never} size={'huge' as never}>
        Invalid
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Invalid' });
    expect(button).toHaveClass('button--primary', 'button--md');
    expect(warnSpy).toHaveBeenCalledTimes(2);

    process.env.NODE_ENV = originalNodeEnv;
  });
});
