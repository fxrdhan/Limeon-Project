import React from 'react';
import {
  useItemForm,
  useItemHistory,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import ItemFormHeader from '../../molecules/ItemFormHeader';

interface FormHeaderSectionProps {
  onReset?: () => void;
  onClose: () => void;
  itemId?: string;
}

const FormHeaderSection: React.FC<FormHeaderSectionProps> = ({
  onReset,
  onClose,
  itemId,
}) => {
  const { canUndo, canRedo, undoFormChange, redoFormChange } = useItemForm();
  const {
    isEditMode,
    formattedUpdateAt,
    isClosing,
    handleVersionSelect,
    handleClearVersionView,
    viewingVersionNumber,
  } = useItemUI();
  const historyState = useItemHistory();

  const currentVersionNumber =
    historyState?.data && historyState.data.length > 0
      ? historyState.data[0].version_number
      : undefined;

  return (
    <ItemFormHeader
      isEditMode={isEditMode}
      formattedUpdateAt={formattedUpdateAt}
      isClosing={isClosing}
      onReset={onReset}
      onClose={onClose}
      history={historyState?.data || null}
      isHistoryLoading={historyState?.isLoading || false}
      selectedVersion={viewingVersionNumber}
      currentVersion={currentVersionNumber}
      onVersionSelect={handleVersionSelect}
      onVersionDeselect={handleClearVersionView}
      entityId={itemId}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={undoFormChange}
      onRedo={redoFormChange}
    />
  );
};

export default FormHeaderSection;
