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
});
