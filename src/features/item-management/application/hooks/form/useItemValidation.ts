import { useMemo } from 'react';

interface ValidationFormData {
  code: string;
  name: string;
  category_id: string;
  type_id: string;
  package_id: string;
  unit_id: string;
  dosage_id: string;
  manufacturer_id: string;
  base_price: number;
  sell_price: number;
}

interface UseItemFormValidationProps {
  formData: ValidationFormData;
  isDirtyFn?: () => boolean;
  isEditMode: boolean;
  operationsPending: boolean;
}

export const useItemFormValidation = ({
  formData,
  isDirtyFn,
  isEditMode,
  operationsPending,
}: UseItemFormValidationProps) => {
  const formIsInvalid = useMemo(
    () =>
      !formData.name?.trim() ||
      !formData.category_id ||
      !formData.type_id ||
      !formData.package_id ||
      !formData.dosage_id ||
      !formData.manufacturer_id ||
      !formData.base_price ||
      formData.base_price <= 0 ||
      !formData.sell_price ||
      formData.sell_price <= 0,
    [formData]
  );

  const disableCondition = formIsInvalid || operationsPending;

  const finalDisabledState = useMemo(
    () =>
      isEditMode
        ? disableCondition || (isDirtyFn ? !isDirtyFn() : false)
        : disableCondition,
    [isEditMode, disableCondition, isDirtyFn]
  );

  return {
    formIsInvalid,
    operationsPending,
    finalDisabledState,
  };
};
