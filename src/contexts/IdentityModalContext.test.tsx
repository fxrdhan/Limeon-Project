import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  IdentityModalProvider,
  useIdentityModalContext,
  type IdentityModalContextValue,
} from './IdentityModalContext';

const createContextValue = (): IdentityModalContextValue => ({
  editMode: {},
  editValues: {},
  currentImageUrl: null,
  isUploadingImage: false,
  loadingField: {},
  isSubmitting: false,
  localData: {},
  title: 'Identity',
  mode: 'edit',
  formattedUpdateAt: '2026-02-10',
  imageAspectRatio: 'default',
  showImageUploader: true,
  useInlineFieldActions: true,
  imageUploadText: 'Upload',
  imageNotAvailableText: 'N/A',
  imageFormatHint: 'JPG/PNG',
  defaultImageUrl: undefined,
  imagePlaceholder: undefined,
  fields: [],
  toggleEdit: vi.fn(),
  handleChange: vi.fn(),
  handleSaveField: vi.fn(),
  handleCancelEdit: vi.fn(),
  handleSaveAll: vi.fn(),
  handleImageUpload: vi.fn(),
  handleImageDeleteInternal: vi.fn(),
  handleCloseModal: vi.fn(),
  onDeleteRequest: undefined,
  deleteButtonLabel: 'Delete',
  setInputRef: vi.fn(),
});

const Consumer = () => {
  const context = useIdentityModalContext();
  return (
    <div>
      <span data-testid="title">{context.title}</span>
      <span data-testid="mode">{context.mode}</span>
      <span data-testid="delete-label">{context.deleteButtonLabel}</span>
    </div>
  );
};

describe('IdentityModalContext', () => {
  it('provides context values through provider', () => {
    const value = createContextValue();

    render(
      <IdentityModalProvider value={value}>
        <Consumer />
      </IdentityModalProvider>
    );

    expect(screen.getByTestId('title')).toHaveTextContent('Identity');
    expect(screen.getByTestId('mode')).toHaveTextContent('edit');
    expect(screen.getByTestId('delete-label')).toHaveTextContent('Delete');
  });

  it('throws when hook is used outside provider', () => {
    expect(() => render(<Consumer />)).toThrowError(
      'useIdentityModalContext must be used within an IdentityModalProvider'
    );
  });
});
