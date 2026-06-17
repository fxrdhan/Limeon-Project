import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import ImageExpandPreview from '.';

describe('ImageExpandPreview', () => {
  it('applies configured backdrop accessibility props', () => {
    const onBackdropKeyDown = vi.fn();
    const onClose = vi.fn();

    render(
      <ImageExpandPreview
        isOpen
        isVisible
        onClose={onClose}
        backdropRole="button"
        backdropTabIndex={2}
        backdropAriaLabel="Tutup preview gambar"
        onBackdropKeyDown={onBackdropKeyDown}
      >
        <img alt="Preview" src="/preview.png" />
      </ImageExpandPreview>
    );

    const backdrop = screen.getByRole('button', {
      name: 'Tutup preview gambar',
    });

    expect(backdrop.getAttribute('tabindex')).toBe('2');

    fireEvent.keyDown(backdrop, { key: 'Enter' });
    fireEvent.click(backdrop);

    expect(onBackdropKeyDown).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps content clicks from closing the preview by default', () => {
    const onClose = vi.fn();

    render(
      <ImageExpandPreview isOpen isVisible onClose={onClose}>
        <button type="button">Preview action</button>
      </ImageExpandPreview>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview action' }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
