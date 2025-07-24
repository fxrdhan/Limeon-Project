import React, { createContext, useContext } from "react";
import type { FieldConfig } from "@/types";

export interface DetailModalContextValue {
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
  mode: "edit" | "add";
  formattedUpdateAt: string;
  imageAspectRatio: "default" | "square";
  
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
  onDeleteRequest?: (data: Record<string, string | number | boolean | null>) => void;
  deleteButtonLabel: string;
  
  // Refs
  setInputRef: (fieldKey: string, element: HTMLInputElement | HTMLTextAreaElement | null) => void;
}

const DetailModalContext = createContext<DetailModalContextValue | undefined>(undefined);

export const useDetailModalContext = () => {
  const context = useContext(DetailModalContext);
  if (context === undefined) {
    throw new Error("useDetailModalContext must be used within a DetailModalProvider");
  }
  return context;
};

interface DetailModalProviderProps {
  children: React.ReactNode;
  value: DetailModalContextValue;
}

export const DetailModalProvider: React.FC<DetailModalProviderProps> = ({
  children,
  value,
}) => {
  return (
    <DetailModalContext.Provider value={value}>
      {children}
    </DetailModalContext.Provider>
  );
};