import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import Button from '.';

describe('Button', () => {
  it('keeps the native button disabled while loading even when disabled is false', () => {
    const onClick = vi.fn();
    render(
      <Button isLoading disabled={false} onClick={onClick}>
        Simpan
      </Button>
    );

    const button = screen.getByRole('button', { name: /Loading/ });

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('preserves explicit disabled state when not loading', () => {
    render(<Button disabled>Hapus</Button>);

    const button = screen.getByRole('button', { name: 'Hapus' });

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
