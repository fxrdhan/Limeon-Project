import { createContext, useContext } from "react";

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
  };
  action: {
    isLoading: boolean;
    isDeleting: boolean;
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
