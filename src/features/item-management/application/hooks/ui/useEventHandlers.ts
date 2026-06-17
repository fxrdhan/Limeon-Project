import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type RefObject,
} from 'react';

interface AddItemFormType {
  handleSelectChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  units: Array<{ id: string; name: string }>;
  packageConversionHook: { setBaseUnit: (unit: string) => void };
  setMarginPercentage: (value: string) => void;
  formData: { base_price: number; min_stock: number; is_medicine: boolean };
  updateFormData: (data: Record<string, unknown>) => void;
  calculateSellPriceFromMargin: (margin: number) => number;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  calculateProfitPercentage: () => number | null;
  setEditingMargin: (editing: boolean) => void;
  marginPercentage: string;
  setMinStockValue: (value: string) => void;
  setEditingMinStock: (editing: boolean) => void;
  minStockValue: string;
  handleCancel: (
    closingStateSetter?:
      | ((value: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>
  ) => void;
}

interface AddItemEventHandlersProps {
  addItemForm: AddItemFormType;
  marginInputRef: RefObject<HTMLInputElement | null>;
  minStockInputRef: RefObject<HTMLInputElement | null>;
  expiryCheckboxRef?: RefObject<HTMLLabelElement | null>;
}

type TimeoutRef = { current: ReturnType<typeof setTimeout> | null };

export const useAddItemEventHandlers = ({
  addItemForm,
  marginInputRef,
  minStockInputRef,
  expiryCheckboxRef,
}: AddItemEventHandlersProps) => {
  const sellPriceMarginSyncTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const marginFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const minStockFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const expiryFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearTimerRef = useCallback((timerRef: TimeoutRef) => {
    if (timerRef.current === null) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(
    () => () => {
      clearTimerRef(sellPriceMarginSyncTimerRef);
      clearTimerRef(marginFocusTimerRef);
      clearTimerRef(minStockFocusTimerRef);
      clearTimerRef(expiryFocusTimerRef);
    },
    [clearTimerRef]
  );

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    addItemForm.handleSelectChange(e);
  };

  const handleDropdownChange = (name: string, value: string) => {
    handleSelectChange({
      target: { name, value },
    } as ChangeEvent<HTMLSelectElement>);
  };

  const handleMarginChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    addItemForm.setMarginPercentage(value);

    const margin = parseFloat(value);
    if (!isNaN(margin) && addItemForm.formData.base_price > 0) {
      addItemForm.updateFormData({
        sell_price: addItemForm.calculateSellPriceFromMargin(margin),
      });
    }
  };

  const handleSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addItemForm.handleChange(e);
    clearTimerRef(sellPriceMarginSyncTimerRef);
    sellPriceMarginSyncTimerRef.current = setTimeout(() => {
      const profit = addItemForm.calculateProfitPercentage();
      if (profit !== null) addItemForm.setMarginPercentage(profit.toFixed(1));
      sellPriceMarginSyncTimerRef.current = null;
    }, 0);
  };

  const startEditingMargin = () => {
    const currentMargin = addItemForm.calculateProfitPercentage();
    addItemForm.setMarginPercentage(
      currentMargin !== null ? currentMargin.toFixed(1) : '0'
    );
    addItemForm.setEditingMargin(true);

    clearTimerRef(marginFocusTimerRef);
    marginFocusTimerRef.current = setTimeout(() => {
      if (marginInputRef.current) {
        marginInputRef.current.focus();
        marginInputRef.current.select();
      }
      marginFocusTimerRef.current = null;
    }, 10);
  };

  const stopEditingMargin = () => {
    addItemForm.setEditingMargin(false);

    const margin = parseFloat(addItemForm.marginPercentage);
    if (!isNaN(margin) && addItemForm.formData.base_price > 0) {
      addItemForm.updateFormData({
        sell_price: addItemForm.calculateSellPriceFromMargin(margin),
      });
    }
  };

  const handleMarginKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      stopEditingMargin();

      const margin = parseFloat(addItemForm.marginPercentage);
      if (!isNaN(margin) && addItemForm.formData.base_price > 0) {
        addItemForm.updateFormData({
          sell_price: addItemForm.calculateSellPriceFromMargin(margin),
        });
      }
    }
  };

  const startEditingMinStock = () => {
    addItemForm.setMinStockValue(String(addItemForm.formData.min_stock));
    addItemForm.setEditingMinStock(true);

    clearTimerRef(minStockFocusTimerRef);
    minStockFocusTimerRef.current = setTimeout(() => {
      if (minStockInputRef.current) {
        minStockInputRef.current.focus();
        minStockInputRef.current.select();
      }
      minStockFocusTimerRef.current = null;
    }, 10);
  };

  const stopEditingMinStock = () => {
    addItemForm.setEditingMinStock(false);

    const stockValue = parseInt(addItemForm.minStockValue, 10);
    if (!isNaN(stockValue) && stockValue >= 0) {
      addItemForm.updateFormData({ min_stock: stockValue });
    } else {
      addItemForm.setMinStockValue(String(addItemForm.formData.min_stock));
    }
  };

  const handleMinStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addItemForm.setMinStockValue(e.target.value);
  };

  const handleMinStockKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      stopEditingMinStock();
      if (addItemForm.formData.is_medicine && expiryCheckboxRef?.current) {
        clearTimerRef(expiryFocusTimerRef);
        expiryFocusTimerRef.current = setTimeout(() => {
          expiryCheckboxRef.current?.focus();
          expiryFocusTimerRef.current = null;
        }, 0);
      }
    }
  };

  const handleActualCancel = (
    closingStateSetter?:
      | ((value: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    addItemForm.handleCancel(closingStateSetter);
  };

  return {
    handleSelectChange,
    handleDropdownChange,
    handleMarginChange,
    handleSellPriceChange,
    startEditingMargin,
    stopEditingMargin,
    handleMarginKeyDown,
    startEditingMinStock,
    stopEditingMinStock,
    handleMinStockChange,
    handleMinStockKeyDown,
    handleActualCancel,
  };
};
