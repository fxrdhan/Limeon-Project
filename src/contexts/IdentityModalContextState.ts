import { createContext } from 'react';
import type { FieldConfig } from '@/types';

export interface IdentityModalContextValue {
  editMode: Record<string, boolean>;
  editValues: Record<string, string | number | boolean | null>;
  currentImageUrl: string | null;
  pendingImageDelete: boolean;
  isUploadingImage: boolean;
  loadingField: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  localData: Record<string, string | number | boolean | null>;
  title: string;
  mode: 'edit' | 'add';
  formattedUpdateAt: string;
  imageAspectRatio: 'default' | 'square';
  showImageUploader: boolean;
  useInlineFieldActions: boolean;
  imageUploadText: string;
  imageNotAvailableText: string;
  imageFormatHint: string;
  defaultImageUrl?: string;
  imagePlaceholder?: string;
  fields: FieldConfig[];
  toggleEdit: (fieldKey: string) => void;
  handleChange: (
    fieldKey: string,
    value: string | number | boolean | null
  ) => void;
  handleSaveField: (fieldKey: string) => Promise<void>;
  handleCancelEdit: (fieldKey: string) => void;
  handleSaveAll: () => Promise<void>;
  handleImageUpload: (file: File) => Promise<void>;
  handleImageDeleteInternal: () => Promise<void>;
  handleCloseModal: () => void;
  onDeleteRequest?: (
    data: Record<string, string | number | boolean | null>
  ) => void;
  deleteButtonLabel: string;
  setInputRef: (
    fieldKey: string,
    element: HTMLInputElement | HTMLTextAreaElement | null
  ) => void;
}

export const IdentityModalContext = createContext<
  IdentityModalContextValue | undefined
>(undefined);
