import { useMemo } from "react";
import type { UseItemFormValidationProps } from "../types";

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
      !formData.unit_id ||
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