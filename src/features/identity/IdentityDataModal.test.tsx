import { render, screen } from '@testing-library/react';
import { useIdentityModalContext } from '@/contexts/IdentityModalContext';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import IdentityDataModal from './IdentityDataModal';

const useIdentityModalLogicMock = vi.hoisted(() => vi.fn());

const templatePropsStore = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('./hooks/useIdentityModalLogic', () => ({
  useIdentityModalLogic: (options: Record<string, unknown>) =>
    useIdentityModalLogicMock(options),
}));

vi.mock('@/features/identity/components/IdentitylModalTemplate', () => ({
  default: (props: Record<string, unknown>) => {
    templatePropsStore.current = props;
    return (
      <div data-testid="identity-template">{props.children as ReactNode}</div>
    );
  },
}));

vi.mock('./components/IdentityModalContent', () => ({
  default: function MockIdentityModalContent() {
    const context = useIdentityModalContext();
    return <div data-testid="identity-context-title">{context.title}</div>;
  },
}));

describe('IdentityDataModal', () => {
  it('forwards props into logic hook and renders template/content via provider context', () => {
    const onClose = vi.fn();
    const resetInternalState = vi.fn();

    useIdentityModalLogicMock.mockReturnValue({
      contextValue: {
        editMode: {},
        editValues: {},
        currentImageUrl: null,
        isUploadingImage: false,
        loadingField: {},
        isSubmitting: false,
        localData: {},
        title: 'Context Title',
        mode: 'edit',
        formattedUpdateAt: '-',
        imageAspectRatio: 'default',
        showImageUploader: true,
        useInlineFieldActions: true,
        imageUploadText: 'Unggah',
        imageNotAvailableText: 'Belum ada',
        imageFormatHint: 'PNG/JPG',
        fields: [],
        toggleEdit: vi.fn(),
        handleChange: vi.fn(),
        handleSaveField: vi.fn(),
        handleCancelEdit: vi.fn(),
        handleSaveAll: vi.fn(),
        handleImageUpload: vi.fn(),
        handleImageDeleteInternal: vi.fn(),
        handleCloseModal: vi.fn(),
        deleteButtonLabel: 'Hapus',
        setInputRef: vi.fn(),
      },
      resetInternalState,
    });

    render(
      <IdentityDataModal
        title="Tambah Supplier"
        data={{ id: 'sup-1', name: 'Supplier A' }}
        fields={
          [{ key: 'name', label: 'Nama Supplier', type: 'text' }] as never
        }
        isOpen={true}
        onClose={onClose}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(useIdentityModalLogicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tambah Supplier',
        isOpen: true,
        onClose,
        imageUploadText: 'Unggah gambar',
        imageNotAvailableText: 'Gambar belum tersedia',
        imageFormatHint: 'Format: JPG, PNG',
        deleteButtonLabel: 'Hapus',
        mode: 'edit',
        imageAspectRatio: 'default',
        showImageUploader: true,
        useInlineFieldActions: false,
      })
    );

    expect(templatePropsStore.current).toMatchObject({
      isOpen: true,
      onClose,
      resetInternalState,
    });
    expect(screen.getByTestId('identity-template')).toBeInTheDocument();
    expect(screen.getByTestId('identity-context-title')).toHaveTextContent(
      'Context Title'
    );
  });
});
