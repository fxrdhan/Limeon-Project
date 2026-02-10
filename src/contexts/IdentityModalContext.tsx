import React, { createContext, useContext } from 'react';
import type { FieldConfig } from '@/types';

export interface IdentityModalContextValue {
  // State
  editMode: Record<string, boolean>;
  editValues: Record<string, string | number | boolean | null>;
  currentImageUrl: string | null;
  isUploadingImage: boolean;
  loadingField: Record<string, boolean>;
  isSubmitting: boolean;
  localData: Record<string, string | number | boolean | null>;

  // UI State
  title: string;
  mode: 'edit' | 'add';
  formattedUpdateAt: string;
  imageAspectRatio: 'default' | 'square';
  showImageUploader: boolean;
  useInlineFieldActions: boolean;

  // Image Config
  imageUploadText: string;
  imageNotAvailableText: string;
  imageFormatHint: string;
  defaultImageUrl?: string;
  imagePlaceholder?: string;

  // Field Config
  fields: FieldConfig[];

  // Actions
  toggleEdit: (fieldKey: string) => void;
  handleChange: (fieldKey: string, value: string | number | boolean) => void;
  handleSaveField: (fieldKey: string) => Promise<void>;
  handleCancelEdit: (fieldKey: string) => void;
  handleSaveAll: () => Promise<void>;
  handleImageUpload: (file: File) => Promise<void>;
  handleImageDeleteInternal: () => Promise<void>;
  handleCloseModal: () => void;

  // Delete Action
  onDeleteRequest?: (
    data: Record<string, string | number | boolean | null>
  ) => void;
  deleteButtonLabel: string;

  // Refs
  setInputRef: (
    fieldKey: string,
    element: HTMLInputElement | HTMLTextAreaElement | null
  ) => void;
}

const IdentityModalContext = createContext<
  IdentityModalContextValue | undefined
>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useIdentityModalContext = () => {
  const context = useContext(IdentityModalContext);
  if (context === undefined) {
    throw new Error(
      'useIdentityModalContext must be used within an IdentityModalProvider'
    );
  }
  return context;
};

interface IdentityModalProviderProps {
  children: React.ReactNode;
  value: IdentityModalContextValue;
}

export const IdentityModalProvider: React.FC<IdentityModalProviderProps> = ({
  children,
  value,
}) => {
  return (
    <IdentityModalContext.Provider value={value}>
      {children}
    </IdentityModalContext.Provider>
  );
};
