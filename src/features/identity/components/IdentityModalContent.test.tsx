import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { IdentityModalProvider } from '@/contexts/IdentityModalContext';
import IdentityModalContent from './IdentityModalContent';

vi.mock('@/components/button', () => ({
  default: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('./IdentityImageUploader', () => ({
  default: () => <div data-testid="identity-image-uploader">uploader</div>,
}));

vi.mock('./IdentityFormField', () => ({
  default: ({ field }: { field: { key: string } }) => (
    <div data-testid="identity-form-field">{field.key}</div>
  ),
}));

const buildContext = (overrides: Record<string, unknown> = {}) => ({
  editMode: {},
  editValues: {},
  currentImageUrl: null,
  isUploadingImage: false,
  loadingField: {},
  isSubmitting: false,
  localData: { id: 'id-1', name: 'Entity Name' },
  title: 'Detail Entity',
  mode: 'edit' as const,
  formattedUpdateAt: '01 Februari 2026',
  imageAspectRatio: 'default' as const,
  showImageUploader: true,
  useInlineFieldActions: true,
  imageUploadText: 'Unggah',
  imageNotAvailableText: 'Belum tersedia',
  imageFormatHint: 'PNG/JPG',
  defaultImageUrl: undefined,
  imagePlaceholder: undefined,
  fields: [
    { key: 'name', label: 'Nama' },
    { key: 'address', label: 'Alamat' },
  ] as never,
  toggleEdit: vi.fn(),
  handleChange: vi.fn(),
  handleSaveField: vi.fn().mockResolvedValue(undefined),
  handleCancelEdit: vi.fn(),
  handleSaveAll: vi.fn().mockResolvedValue(undefined),
  handleImageUpload: vi.fn().mockResolvedValue(undefined),
  handleImageDeleteInternal: vi.fn().mockResolvedValue(undefined),
  handleCloseModal: vi.fn(),
  onDeleteRequest: vi.fn(),
  deleteButtonLabel: 'Hapus Data',
  setInputRef: vi.fn(),
  ...overrides,
});

describe('IdentityModalContent', () => {
  it('renders edit mode with history, image uploader, and delete/close actions', () => {
    const contextValue = buildContext();

    render(
      <IdentityModalProvider value={contextValue}>
        <IdentityModalContent />
      </IdentityModalProvider>
    );

    expect(screen.getByText('Detail Entity')).toBeInTheDocument();
    expect(screen.getByText('01 Februari 2026')).toBeInTheDocument();
    expect(screen.getByTestId('identity-image-uploader')).toBeInTheDocument();
    expect(screen.getAllByTestId('identity-form-field')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Data' }));
    expect(contextValue.onDeleteRequest).toHaveBeenCalledWith({
      id: 'id-1',
      name: 'Entity Name',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(contextValue.handleCloseModal).toHaveBeenCalledTimes(1);
  });

  it('renders add mode actions and submitting state', () => {
    const contextValue = buildContext({
      mode: 'add',
      formattedUpdateAt: '-',
      isSubmitting: true,
      onDeleteRequest: undefined,
      showImageUploader: false,
    });

    render(
      <IdentityModalProvider value={contextValue}>
        <IdentityModalContent />
      </IdentityModalProvider>
    );

    expect(
      screen.queryByTestId('identity-image-uploader')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('01 Februari 2026')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
    expect(screen.getByText('Menyimpan...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
    expect(contextValue.handleCloseModal).toHaveBeenCalledTimes(1);

    const saveButton = screen.getByRole('button', { name: /Menyimpan/i });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(contextValue.handleSaveAll).not.toHaveBeenCalled();
  });

  it('renders edit form-save footer when inline field actions are disabled', () => {
    const contextValue = buildContext({
      useInlineFieldActions: false,
      isSubmitting: false,
    });

    render(
      <IdentityModalProvider value={contextValue}>
        <IdentityModalContent />
      </IdentityModalProvider>
    );

    expect(
      screen.queryByRole('button', { name: 'Tutup' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hapus Data' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(contextValue.handleSaveAll).toHaveBeenCalledTimes(1);
  });
});
