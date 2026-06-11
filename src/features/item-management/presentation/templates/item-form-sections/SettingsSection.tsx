import React from 'react';
import { useInlineEditor } from '@/hooks/forms/useInlineEditor';
import {
  useItemForm,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import ItemSettingsForm from '../../organisms/ItemSettingsForm';
import type { CollapsibleSectionProps } from './types';

const SettingsSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  onExpand,
  stackClassName,
  stackStyle,
  onRequestNextSection,
}) => {
  const { formData, updateFormData } = useItemForm();
  const { isViewingOldVersion } = useItemUI();

  const minStockEditor = useInlineEditor({
    initialValue: (formData.min_stock || 0).toString(),
    onSave: value => {
      const parsedValue = parseInt(value.toString()) || 0;
      updateFormData({ min_stock: parsedValue });
    },
  });

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'is_active') {
      updateFormData({ is_active: value as boolean });
    } else if (field === 'has_expiry_date') {
      updateFormData({ has_expiry_date: value as boolean });
    } else if (field === 'min_stock') {
      updateFormData({ min_stock: parseInt(value as string) || 0 });
    }
  };

  return (
    <ItemSettingsForm
      formData={{
        is_active: formData.is_active ?? true,
        is_medicine: formData.is_medicine || false,
        has_expiry_date: formData.has_expiry_date || false,
        min_stock: formData.min_stock || 0,
      }}
      minStockEditing={{
        isEditing: minStockEditor.isEditing,
        value: minStockEditor.value,
      }}
      isExpanded={isExpanded}
      onExpand={onExpand}
      stackClassName={stackClassName}
      stackStyle={stackStyle}
      disabled={isViewingOldVersion}
      onFieldChange={handleFieldChange}
      onStartEditMinStock={minStockEditor.startEditing}
      onStopEditMinStock={minStockEditor.stopEditing}
      onMinStockChange={minStockEditor.handleChange}
      onMinStockKeyDown={minStockEditor.handleKeyDown}
      onRequestNextSection={onRequestNextSection}
    />
  );
};

export default SettingsSection;
