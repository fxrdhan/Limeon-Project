import React from 'react';
import {
  useItemActions,
  useItemForm,
  useItemPrice,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import type { ItemModalProps } from '../../../shared/types';
import { ItemFormSections } from '../ItemFormSections';
import ItemModalTemplate from '../ItemModalTemplate';
import ItemModalContainer from '../containers/ItemModalContainer';
import { useItemModalStackSections } from './useItemModalStackSections';

const ItemManagementContent: React.FC<{
  itemId?: string;
  initialItemData?: ItemModalProps['initialItemData'];
}> = ({ itemId, initialItemData }) => {
  const ui = useItemUI();
  const form = useItemForm();
  const price = useItemPrice();
  const actions = useItemActions();
  const {
    activeSection,
    getStackClasses,
    getStackEffect,
    getStackWrapperStyle,
    handleLevelPricingToggle,
    isLevelPricingMode,
    openPricingSectionAndFocus,
    rightColumnProps,
    toggleSection,
  } = useItemModalStackSections({
    itemId,
    initialItemData,
    isOpen: ui.isOpen,
    formData: form.formData,
    formLoading: form.loading,
    conversionCount: price.packageConversionHook.conversions.length,
  });

  return (
    <ItemModalTemplate
      isOpen={ui.isOpen}
      isClosing={ui.isClosing}
      onBackdropClick={ui.handleBackdropClick}
      onSubmit={form.handleSubmit}
      rightColumnProps={rightColumnProps}
      children={{
        header: (
          <ItemFormSections.Header
            onReset={ui.handleReset}
            onClose={ui.handleClose}
            itemId={itemId}
          />
        ),
        basicInfoRequired: (
          <ItemFormSections.BasicInfoRequired itemId={itemId} />
        ),
        basicInfoOptional: !isLevelPricingMode ? (
          <div
            className={`${getStackClasses('additional')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('additional')}
            data-stack-section="additional"
          >
            <ItemFormSections.BasicInfoOptional
              isExpanded={activeSection === 'additional'}
              onExpand={() => toggleSection('additional')}
              itemId={itemId}
              stackClassName={getStackEffect('additional').className}
              stackStyle={getStackEffect('additional').style}
            />
          </div>
        ) : null,
        settingsForm: !isLevelPricingMode ? (
          <div
            className={`${getStackClasses('settings')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('settings')}
            data-stack-section="settings"
          >
            <ItemFormSections.Settings
              isExpanded={activeSection === 'settings'}
              onExpand={() => toggleSection('settings')}
              itemId={itemId}
              onRequestNextSection={openPricingSectionAndFocus}
              stackClassName={getStackEffect('settings').className}
              stackStyle={getStackEffect('settings').style}
            />
          </div>
        ) : null,
        pricingForm: (
          <div
            className={`${isLevelPricingMode ? '' : getStackClasses('pricing')} transition-[margin] duration-200 ease-out`}
            style={
              isLevelPricingMode ? undefined : getStackWrapperStyle('pricing')
            }
            data-stack-section="pricing"
          >
            <ItemFormSections.Pricing
              isExpanded={activeSection === 'pricing'}
              onExpand={() => toggleSection('pricing')}
              itemId={itemId}
              onLevelPricingToggle={handleLevelPricingToggle}
              stackClassName={
                isLevelPricingMode
                  ? undefined
                  : getStackEffect('pricing').className
              }
              stackStyle={
                isLevelPricingMode ? undefined : getStackEffect('pricing').style
              }
            />
          </div>
        ),
        packageConversionManager: !isLevelPricingMode ? (
          <div
            className={`${getStackClasses('conversion')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('conversion')}
            data-stack-section="conversion"
          >
            <ItemFormSections.PackageConversion
              isExpanded={activeSection === 'conversion'}
              onExpand={() => toggleSection('conversion')}
              itemId={itemId}
              stackClassName={getStackEffect('conversion').className}
              stackStyle={getStackEffect('conversion').style}
            />
          </div>
        ) : null,
        modals: <ItemModalContainer />,
      }}
      formAction={{
        onCancel: () => actions.handleCancel(ui.setIsClosing),
        onDelete: ui.isEditMode ? actions.handleDeleteItem : undefined,
        isSaving: actions.saving,
        isDeleting: actions.deleteItemMutation?.isPending || false,
        isEditMode: ui.isEditMode,
        isDisabled: actions.finalDisabledState,
        updateText: 'Simpan',
      }}
    />
  );
};

export default ItemManagementContent;
