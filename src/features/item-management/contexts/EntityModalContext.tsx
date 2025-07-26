import { createContext, useContext } from "react";

export type ModalMode = 'add' | 'edit' | 'history' | 'version-detail';

export interface VersionData {
  id: string;
  version_number: number;
  action_type: string;
  changed_at: string;
  entity_data: Record<string, unknown>;
  changed_fields?: Record<string, { from: unknown; to: unknown }>;
}

export interface EntityModalContextValue {
  // State
  form: {
    name: string;
    description: string;
    isDirty: boolean;
    isValid: boolean;
  };
  ui: {
    isOpen: boolean;
    isEditMode: boolean;
    entityName: string;
    formattedUpdateAt: string;
    mode: ModalMode;
  };
  action: {
    isLoading: boolean;
    isDeleting: boolean;
  };
  history: {
    entityTable: string;
    entityId: string;
    selectedVersion?: VersionData;
  };

  // Actions
  formActions: {
    setName: (name: string) => void;
    setDescription: (description: string) => void;
    handleSubmit: () => Promise<void>;
    handleDelete: () => void;
    resetForm: () => void;
  };
  uiActions: {
    handleClose: () => void;
    handleBackdropClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    setMode: (mode: ModalMode) => void;
    openHistory: (entityTable: string, entityId: string) => void;
    openVersionDetail: (version: VersionData) => void;
    goBack: () => void;
  };
}

const EntityModalContext = createContext<EntityModalContextValue | null>(null);

export const EntityModalProvider = EntityModalContext.Provider;

// eslint-disable-next-line react-refresh/only-export-components
export const useEntityModal = () => {
  const context = useContext(EntityModalContext);
  if (!context) {
    throw new Error("useEntityModal must be used within EntityModalProvider");
  }
  return context;
};
