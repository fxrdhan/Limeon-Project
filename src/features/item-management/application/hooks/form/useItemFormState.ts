import { useState, useRef } from 'react';
import { formatRupiah, extractNumericValue } from '@/lib/formatters';
import { formatMarginPercentage } from '../../../shared/utils/PriceCalculator';
import type { ItemFormData, UnitConversion } from '../../../shared/types';
import type { Category, MedicineType, Unit } from '@/types';
import type { ItemDosage } from '../../../domain/entities/Item';

interface UseAddItemFormStateProps {
  initialSearchQuery?: string;
}

/**
 * Hook for managing form state and display values
 */
export const useAddItemFormState = ({
  initialSearchQuery,
}: UseAddItemFormStateProps) => {
  // Core form state
  const [formData, setFormData] = useState<ItemFormData>({
    code: '',
    name: initialSearchQuery || '',
    manufacturer: '',
    type_id: '',
    category_id: '',
    unit_id: '',
    dosage_id: '',
    barcode: '',
    description: '',
    base_price: 0,
    sell_price: 0,
    min_stock: 10,
    is_active: true,
    is_medicine: true,
    has_expiry_date: false,
    updated_at: null,
  });

  // Initial state tracking for dirty detection
  const [initialFormData, setInitialFormData] = useState<ItemFormData | null>(
    null
  );
  const [initialUnitConversions, setInitialUnitConversions] = useState<
    UnitConversion[] | null
  >(null);

  // Display states for formatted prices
  const [displayBasePrice, setDisplayBasePrice] = useState('');
  const [displaySellPrice, setDisplaySellPrice] = useState('');

  // Editing states
  const [editingMargin, setEditingMargin] = useState(false);
  const [marginPercentage, setMarginPercentage] = useState<string>('0');
  const [editingMinStock, setEditingMinStock] = useState(false);
  const [minStockValue, setMinStockValue] = useState<string>('10');

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [isAddDosageModalOpen, setIsAddDosageModalOpen] = useState(false);
  const [currentSearchTermForModal, setCurrentSearchTermForModal] = useState<
    string | undefined
  >();

  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mode tracking
  const [isEditMode, setIsEditMode] = useState(false);

  // Data collections
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<MedicineType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [dosages, setDosages] = useState<ItemDosage[]>([]);

  // Initialization tracking
  const hasInitialized = useRef(false);

  /**
   * Updates form data and synchronized display values
   */
  const updateFormData = (newData: Partial<ItemFormData>) => {
    // Update display prices if price fields change
    if (newData.sell_price !== undefined) {
      setDisplaySellPrice(formatRupiah(newData.sell_price));
    }
    if (newData.base_price !== undefined) {
      setDisplayBasePrice(formatRupiah(newData.base_price));
    }

    setFormData(prev => ({ ...prev, ...newData }));
  };

  /**
   * Handles form input changes with type-specific processing
   */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (name === 'base_price' || name === 'sell_price') {
      const numericInt = extractNumericValue(value);
      updateFormData({ [name]: numericInt });
      const formattedValue = formatRupiah(numericInt);

      if (name === 'base_price') {
        setDisplayBasePrice(formattedValue);
      } else if (name === 'sell_price') {
        setDisplaySellPrice(formattedValue);
      }
    } else if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      updateFormData({ [name]: checked });
    } else if (type === 'number') {
      updateFormData({ [name]: parseFloat(value) || 0 });
    } else {
      updateFormData({ [name]: value });
    }
  };

  /**
   * Handles select dropdown changes
   */
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  /**
   * Checks if form has unsaved changes
   */
  const isDirty = (currentConversions: UnitConversion[] = []): boolean => {
    if (!initialFormData) return false;

    const formDataChanged =
      JSON.stringify(formData) !== JSON.stringify(initialFormData);

    // Compare unit conversions if provided
    type ConversionForCompare = {
      to_unit_id: string;
      conversion_rate: number;
      basePrice: number;
      sellPrice: number;
    };

    const mapConversionForComparison = (
      conv: UnitConversion
    ): ConversionForCompare | null => {
      if (!conv || !conv.unit || !conv.unit.id) return null;
      return {
        to_unit_id: conv.unit.id,
        conversion_rate: conv.conversion_rate,
        basePrice: conv.basePrice,
        sellPrice: conv.sellPrice,
      };
    };

    const currentConversionsForCompare = currentConversions
      .map(mapConversionForComparison)
      .filter(Boolean) as ConversionForCompare[];

    const initialConversionsForCompare = Array.isArray(initialUnitConversions)
      ? (initialUnitConversions
          .map(mapConversionForComparison)
          .filter(Boolean) as ConversionForCompare[])
      : [];

    const safeSortByUnitId = (arr: ConversionForCompare[]) => {
      return [...arr].sort((a, b) => a.to_unit_id.localeCompare(b.to_unit_id));
    };

    const sortedCurrent = safeSortByUnitId(currentConversionsForCompare);
    const sortedInitial = safeSortByUnitId(initialConversionsForCompare);

    const conversionsChanged =
      JSON.stringify(sortedCurrent) !== JSON.stringify(sortedInitial);

    return formDataChanged || conversionsChanged;
  };

  /**
   * Sets initial data for the form
   */
  const setInitialDataForForm = (data?: ItemFormData) => {
    const initialState = data || {
      code: '',
      name: initialSearchQuery || '',
      manufacturer: '',
      type_id: '',
      category_id: '',
      unit_id: '',
      dosage_id: '',
      barcode: '',
      description: '',
      base_price: 0,
      sell_price: 0,
      min_stock: 10,
      is_active: true,
      is_medicine: true,
      has_expiry_date: false,
      updated_at: null,
    };

    setFormData(initialState);
    setInitialFormData(initialState);

    setDisplayBasePrice(formatRupiah(initialState.base_price || 0));
    setDisplaySellPrice(formatRupiah(initialState.sell_price || 0));

    setMarginPercentage(
      formatMarginPercentage(initialState.base_price, initialState.sell_price)
    );
    setMinStockValue(String(initialState.min_stock || 10));
  };

  /**
   * Resets form to initial state
   */
  const resetForm = () => {
    if (isEditMode && initialFormData && initialUnitConversions) {
      setFormData({ ...initialFormData });
      setDisplayBasePrice(formatRupiah(initialFormData.base_price || 0));
      setDisplaySellPrice(formatRupiah(initialFormData.sell_price || 0));

      setMarginPercentage(
        formatMarginPercentage(
          initialFormData.base_price,
          initialFormData.sell_price
        )
      );
      setMinStockValue(String(initialFormData.min_stock || 10));
    } else {
      setInitialDataForForm();
    }
  };

  return {
    // Core form state
    formData,
    setFormData,
    updateFormData,

    // Initial state tracking
    initialFormData,
    setInitialFormData,
    initialUnitConversions,
    setInitialUnitConversions,

    // Display states
    displayBasePrice,
    setDisplayBasePrice,
    displaySellPrice,
    setDisplaySellPrice,

    // Editing states
    editingMargin,
    setEditingMargin,
    marginPercentage,
    setMarginPercentage,
    editingMinStock,
    setEditingMinStock,
    minStockValue,
    setMinStockValue,

    // Modal states
    isAddEditModalOpen,
    setIsAddEditModalOpen,
    isAddTypeModalOpen,
    setIsAddTypeModalOpen,
    isAddUnitModalOpen,
    setIsAddUnitModalOpen,
    isAddDosageModalOpen,
    setIsAddDosageModalOpen,
    currentSearchTermForModal,
    setCurrentSearchTermForModal,

    // Loading states
    loading,
    setLoading,
    saving,
    setSaving,

    // Mode tracking
    isEditMode,
    setIsEditMode,

    // Data collections
    categories,
    setCategories,
    types,
    setTypes,
    units,
    setUnits,
    dosages,
    setDosages,

    // Initialization tracking
    hasInitialized,

    // Event handlers
    handleChange,
    handleSelectChange,

    // Utility functions
    isDirty,
    setInitialDataForForm,
    resetForm,
  };
};
