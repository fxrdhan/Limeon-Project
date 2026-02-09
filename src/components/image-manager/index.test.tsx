import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImageUploader from './index';

vi.mock('@/components/button', () => ({
  default: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const renderUploader = (
  overrides: Partial<ComponentProps<typeof ImageUploader>> = {}
) => {
  const onImageUpload = vi.fn().mockResolvedValue(undefined);
  const onImageDelete = vi.fn().mockResolvedValue(undefined);

  const view = render(
    <ImageUploader
      id="img-uploader"
      onImageUpload={onImageUpload}
      onImageDelete={onImageDelete}
      hasImage={false}
      interaction="menu"
      {...overrides}
    >
      <div>avatar</div>
    </ImageUploader>
  );

  return {
    ...view,
    onImageUpload,
    onImageDelete,
  };
};

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens popup menu on hover and triggers upload input click', async () => {
    renderUploader();

    const containerButton = screen.getByRole('button', {
      name: 'Upload image',
    });
    const input = document.getElementById('img-uploader') as HTMLInputElement;
    const clickSpy = vi
      .spyOn(input, 'click')
      .mockImplementation(() => undefined);

    fireEvent.mouseEnter(containerButton);

    const uploadOption = await screen.findByRole('button', { name: 'Upload' });
    fireEvent.click(uploadOption);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('validates file types and uploads valid files', async () => {
    const { onImageUpload } = renderUploader();

    const alertSpy = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => undefined);
    const input = document.getElementById('img-uploader') as HTMLInputElement;

    const invalidFile = new File(['bad'], 'note.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(alertSpy).toHaveBeenCalledWith(
      'Tipe file tidak valid. Harap unggah file image/png, image/jpeg, image/jpg, image/webp.'
    );
    expect(onImageUpload).not.toHaveBeenCalled();

    const validFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(onImageUpload).toHaveBeenCalledWith(validFile);
    });
  });

  it('shows upload error when upload callback throws', async () => {
    const failingUpload = vi.fn().mockRejectedValue(new Error('upload fail'));

    render(
      <ImageUploader
        id="img-uploader"
        onImageUpload={failingUpload}
        hasImage={false}
      >
        <div>avatar</div>
      </ImageUploader>
    );

    const input = document.getElementById('img-uploader') as HTMLInputElement;
    const validFile = new File(['img'], 'photo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [validFile] } });

    expect(
      await screen.findByText('Gagal memproses gambar.')
    ).toBeInTheDocument();
  });

  it('renders edit/delete options when image exists and handles delete success/failure', async () => {
    const { onImageDelete, rerender } = renderUploader({ hasImage: true });

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Edit or delete image' })
    );

    expect(
      await screen.findByRole('button', { name: 'Edit' })
    ).toBeInTheDocument();
    const deleteButton = await screen.findByRole('button', { name: 'Hapus' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onImageDelete).toHaveBeenCalledTimes(1);
    });

    const failingDelete = vi.fn().mockRejectedValue(new Error('delete fail'));
    rerender(
      <ImageUploader
        id="img-uploader"
        onImageUpload={vi.fn()}
        onImageDelete={failingDelete}
        hasImage
      >
        <div>avatar</div>
      </ImageUploader>
    );

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Edit or delete image' })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    expect(
      await screen.findByText('Gagal menghapus gambar.')
    ).toBeInTheDocument();
  });

  it('falls back to alert when delete handler is not provided', async () => {
    render(
      <ImageUploader id="img-uploader" onImageUpload={vi.fn()} hasImage>
        <div>avatar</div>
      </ImageUploader>
    );

    const alertSpy = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => undefined);

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Edit or delete image' })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Fitur hapus gambar belum tersedia untuk komponen ini'
    );
  });

  it('supports direct interaction mode and closes popup on outside click or escape', async () => {
    renderUploader({ hasImage: true, interaction: 'menu' });

    const containerButton = screen.getByRole('button', {
      name: 'Edit or delete image',
    });
    fireEvent.mouseEnter(containerButton);
    expect(
      await screen.findByRole('button', { name: 'Edit' })
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Edit' })
      ).not.toBeInTheDocument();
    });

    fireEvent.mouseEnter(containerButton);
    expect(
      await screen.findByRole('button', { name: 'Edit' })
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Edit' })
      ).not.toBeInTheDocument();
    });

    const onImageUpload = vi.fn();
    render(
      <ImageUploader
        id="img-direct"
        onImageUpload={onImageUpload}
        interaction="direct"
        hasImage={false}
      >
        <div>avatar direct</div>
      </ImageUploader>
    );

    const directContainer = screen.getByRole('button', {
      name: 'Upload image',
    });
    const directInput = document.getElementById(
      'img-direct'
    ) as HTMLInputElement;
    const inputClickSpy = vi
      .spyOn(directInput, 'click')
      .mockImplementation(() => undefined);

    fireEvent.click(directContainer);

    expect(inputClickSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Upload' })
    ).not.toBeInTheDocument();
  });

  it('prevents interaction when disabled', async () => {
    renderUploader({ hasImage: true, disabled: true });

    const containerButton = screen.getByRole('button', {
      name: 'Edit or delete image',
    });
    const input = document.getElementById('img-uploader') as HTMLInputElement;
    const inputClickSpy = vi
      .spyOn(input, 'click')
      .mockImplementation(() => undefined);

    fireEvent.mouseEnter(containerButton);
    expect(
      screen.queryByRole('button', { name: 'Edit' })
    ).not.toBeInTheDocument();

    fireEvent.click(containerButton);
    expect(inputClickSpy).not.toHaveBeenCalled();
  });

  it('supports shape variants and ignores file change when no file is selected', () => {
    const { rerender, onImageUpload } = renderUploader({ shape: 'rounded' });
    const getContainer = () =>
      screen.getByRole('button', { name: 'Upload image' });
    const input = document.getElementById('img-uploader') as HTMLInputElement;

    expect(getContainer().className).toContain('rounded-lg');
    fireEvent.change(input, { target: { files: [] } });
    expect(onImageUpload).not.toHaveBeenCalled();

    rerender(
      <ImageUploader
        id="img-uploader"
        onImageUpload={onImageUpload}
        onImageDelete={vi.fn()}
        shape="rounded-sm"
      >
        <div>avatar</div>
      </ImageUploader>
    );
    expect(getContainer().className).toContain('rounded-md');

    rerender(
      <ImageUploader
        id="img-uploader"
        onImageUpload={onImageUpload}
        onImageDelete={vi.fn()}
        shape="square"
      >
        <div>avatar</div>
      </ImageUploader>
    );
    expect(getContainer().className).toContain('rounded-none');

    rerender(
      <ImageUploader
        id="img-uploader"
        onImageUpload={onImageUpload}
        onImageDelete={vi.fn()}
        shape={'unknown' as never}
      >
        <div>avatar</div>
      </ImageUploader>
    );
    expect(getContainer().className).toContain('rounded-full');
  });

  it('uses showPicker when available and falls back to click when showPicker throws', async () => {
    renderUploader();
    const containerButton = screen.getByRole('button', {
      name: 'Upload image',
    });
    fireEvent.mouseEnter(containerButton);

    const uploadOption = await screen.findByRole('button', { name: 'Upload' });
    const input = document.getElementById(
      'img-uploader'
    ) as HTMLInputElement & {
      showPicker?: () => void;
    };
    const inputClickSpy = vi
      .spyOn(input, 'click')
      .mockImplementation(() => undefined);

    const showPickerSpy = vi.fn();
    input.showPicker = showPickerSpy;
    fireEvent.click(uploadOption);
    expect(showPickerSpy).toHaveBeenCalledTimes(1);
    expect(inputClickSpy).not.toHaveBeenCalled();

    input.showPicker = vi.fn(() => {
      throw new Error('show picker not allowed');
    });
    fireEvent.click(uploadOption);
    expect(inputClickSpy).toHaveBeenCalledTimes(1);
  });

  it('updates popup placement for left and clamped fallback positions', async () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 320,
      configurable: true,
      writable: true,
    });

    renderUploader({ hasImage: true });
    const containerButton = screen.getByRole('button', {
      name: 'Edit or delete image',
    });

    let rect = {
      left: 220,
      right: 280,
      top: 120,
      bottom: 160,
      width: 60,
      height: 40,
      x: 220,
      y: 120,
      toJSON: () => ({}),
    };
    vi.spyOn(containerButton, 'getBoundingClientRect').mockImplementation(
      () => rect as DOMRect
    );

    fireEvent.mouseEnter(containerButton);
    await screen.findByRole('button', { name: 'Edit' });

    const portal = document.body.querySelector(
      '.fixed.z-\\[9999\\]'
    ) as HTMLElement;
    vi.spyOn(portal, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          ...rect,
          width: 120,
        }) as DOMRect
    );

    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(document.body.querySelector('.left-full')).toBeInTheDocument();
    });

    rect = {
      ...rect,
      left: 40,
      right: 100,
      x: 40,
      width: 60,
    };
    Object.defineProperty(window, 'innerWidth', {
      value: 180,
      configurable: true,
      writable: true,
    });
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(document.body.querySelector('.right-full')).toBeInTheDocument();
    });

    rect = {
      ...rect,
      left: 90,
      right: 150,
      x: 90,
    };
    Object.defineProperty(window, 'innerWidth', {
      value: 230,
      configurable: true,
      writable: true,
    });
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => {
      expect(document.body.querySelector('.left-full')).toBeInTheDocument();
    });
  });

  it('handles focus visibility and popup hover timeout transitions', async () => {
    renderUploader({ hasImage: true });

    const containerButton = screen.getByRole('button', {
      name: 'Edit or delete image',
    });

    fireEvent.focus(containerButton);
    expect(
      await screen.findByRole('button', { name: 'Edit' })
    ).toBeInTheDocument();
    fireEvent.blur(containerButton);

    fireEvent.mouseEnter(containerButton);
    const portal = document.body.querySelector(
      '.fixed.z-\\[9999\\]'
    ) as HTMLElement;
    fireEvent.mouseLeave(containerButton);
    fireEvent.mouseEnter(containerButton);

    fireEvent.mouseEnter(portal);
    fireEvent.mouseLeave(portal);
    fireEvent.mouseLeave(containerButton);
    await new Promise(resolve => setTimeout(resolve, 130));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Edit' })
      ).not.toBeInTheDocument();
    });
  });

  it('prevents duplicate delete calls while deletion is in progress', async () => {
    let resolveDelete: (() => void) | null = null;
    const onImageDelete = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveDelete = resolve;
        })
    );

    render(
      <ImageUploader
        id="img-uploader"
        onImageUpload={vi.fn()}
        onImageDelete={onImageDelete}
        hasImage
      >
        <div>avatar</div>
      </ImageUploader>
    );

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Edit or delete image' })
    );
    const deleteButton = await screen.findByRole('button', { name: 'Hapus' });

    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);
    expect(onImageDelete).toHaveBeenCalledTimes(1);

    resolveDelete?.();
    await Promise.resolve();
  });
});
