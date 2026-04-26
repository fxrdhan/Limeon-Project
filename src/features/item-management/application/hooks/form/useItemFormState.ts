import { useCallback, useEffect, useRef, useState } from 'react';
import { formatRupiah, extractNumericValue } from '@/lib/formatters';
import { formatMarginPercentage } from '../../../shared/utils/PriceCalculator';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type {
  ItemCategory,
  ItemTypeEntity,
  ItemPackage,
  ItemDosageEntity,
  ItemManufacturerEntity,
  ItemUnitEntity,
} from '../../../shared/types';

interface UseAddItemFormStateProps {
  initialSearchQuery?: string;
}

const MAX_UNDO_HISTORY = 80;
const UNDO_COMMIT_DELAY_MS = 500;

/**
 * Hook for managing form state and display values
 */
export const useAddItemFormState = ({
  initialSearchQuery,
}: UseAddItemFormStateProps) => {
  // Core form state
  const [formData, setFormDataState] = useState<ItemFormData>({
    code: '',
    name: initialSearchQuery || '',
    manufacturer_id: '',
    type_id: '',
    category_id: '',
    package_id: '',
    base_inventory_unit_id: '',
    dosage_id: '',
    barcode: '',
    description: '',
    image_urls: [],
    base_price: 0,
    sell_price: 0,
    is_level_pricing_active: true,
    min_stock: 10,
    quantity: 0,
    unit_id: '',
    measurement_denominator_value: null,
    measurement_denominator_unit_id: '',
    is_active: true,
    is_medicine: true,
    has_expiry_date: false,
    updated_at: null,
    customer_level_discounts: [],
  });

  // Initial state tracking for dirty detection
  const [initialFormData, setInitialFormData] = useState<ItemFormData | null>(
    null
  );
  const [initialPackageConversions, setInitialPackageConversions] = useState<
    PackageConversion[] | null
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
  const [isAddManufacturerModalOpen, setIsAddManufacturerModalOpen] =
    useState(false);
  const [persistedDropdownName, setPersistedDropdownName] = useState<
    string | null
  >(null);
  const [currentSearchTermForModal, setCurrentSearchTermForModal] = useState<
    string | undefined
  >();

  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mode tracking
  const [isEditMode, setIsEditMode] = useState(false);

  // Data collections
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [types, setTypes] = useState<ItemTypeEntity[]>([]);
  const [packages, setPackages] = useState<ItemPackage[]>([]);
  const [units, setUnits] = useState<ItemUnitEntity[]>([]);
  const [dosages, setDosages] = useState<ItemDosageEntity[]>([]);
  const [manufacturers, setManufacturers] = useState<ItemManufacturerEntity[]>(
    []
  );

  // Initialization tracking
  const hasInitialized = useRef(false);
  const formDataRef = useRef(formData);
  const undoStackRef = useRef<ItemFormData[]>([]);
  const redoStackRef = useRef<ItemFormData[]>([]);
  const pendingUndoBaseRef = useRef<ItemFormData | null>(null);
  const pendingUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [undoDepth, setUndoDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);
  const [hasPendingUndo, setHasPendingUndo] = useState(false);

  const setFormData = useCallback(
    (
      nextDataOrUpdater: ItemFormData | ((prev: ItemFormData) => ItemFormData)
    ) => {
      setFormDataState(previousData => {
        const nextData =
          typeof nextDataOrUpdater === 'function'
            ? nextDataOrUpdater(previousData)
            : nextDataOrUpdater;
        formDataRef.current = nextData;
        return nextData;
      });
    },
    []
  );

  const updateUndoRedoDepth = useCallback(() => {
    setUndoDepth(undoStackRef.current.length);
    setRedoDepth(redoStackRef.current.length);
  }, []);

  const clearPendingUndoTimer = useCallback(() => {
    if (pendingUndoTimerRef.current) {
      clearTimeout(pendingUndoTimerRef.current);
      pendingUndoTimerRef.current = null;
    }
  }, []);

  const commitPendingUndoHistory = useCallback(() => {
    const pendingUndoBase = pendingUndoBaseRef.current;
    if (!pendingUndoBase) return;

    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO_HISTORY - 1)),
      pendingUndoBase,
    ];
    pendingUndoBaseRef.current = null;
    setHasPendingUndo(false);
    clearPendingUndoTimer();
    updateUndoRedoDepth();
  }, [clearPendingUndoTimer, updateUndoRedoDepth]);

  const schedulePendingUndoCommit = useCallback(
    (baseData: ItemFormData) => {
      if (!pendingUndoBaseRef.current) {
        pendingUndoBaseRef.current = baseData;
        setHasPendingUndo(true);
      }

      clearPendingUndoTimer();
      pendingUndoTimerRef.current = setTimeout(() => {
        commitPendingUndoHistory();
      }, UNDO_COMMIT_DELAY_MS);
    },
    [clearPendingUndoTimer, commitPendingUndoHistory]
  );

  const syncDerivedFormState = useCallback((data: ItemFormData) => {
    setDisplaySellPrice(formatRupiah(data.sell_price || 0));
    setDisplayBasePrice(formatRupiah(data.base_price || 0));
    setMarginPercentage(
      formatMarginPercentage(data.base_price, data.sell_price)
    );
    setMinStockValue(String(data.min_stock || 10));
  }, []);

  const resetUndoRedoHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    pendingUndoBaseRef.current = null;
    setHasPendingUndo(false);
    clearPendingUndoTimer();
    updateUndoRedoDepth();
  }, [clearPendingUndoTimer, updateUndoRedoDepth]);

  const applyFormData = useCallback(
    (
      nextDataOrUpdater:
        | ItemFormData
        | ((previousData: ItemFormData) => ItemFormData),
      options: { recordHistory?: boolean } = {}
    ) => {
      const { recordHistory = true } = options;
      const previousData = formDataRef.current;
      const nextData =
        typeof nextDataOrUpdater === 'function'
          ? nextDataOrUpdater(previousData)
          : nextDataOrUpdater;

      if (JSON.stringify(previousData) === JSON.stringify(nextData)) {
        return;
      }

      if (recordHistory) {
        redoStackRef.current = [];
        setRedoDepth(0);
        schedulePendingUndoCommit(previousData);
      }

      syncDerivedFormState(nextData);
      formDataRef.current = nextData;
      setFormDataState(nextData);
    },
    [schedulePendingUndoCommit, syncDerivedFormState]
  );

  /**
   * Updates form data and synchronized display values
   */
  const updateFormData = useCallback(
    (newData: Partial<ItemFormData>, options?: { recordHistory?: boolean }) => {
      applyFormData(previousData => ({ ...previousData, ...newData }), options);
    },
    [applyFormData]
  );

  const undoFormChange = useCallback(() => {
    const currentData = formDataRef.current;
    const pendingUndoBase = pendingUndoBaseRef.current;
    if (pendingUndoBase) {
      pendingUndoBaseRef.current = null;
      setHasPendingUndo(false);
      clearPendingUndoTimer();
      redoStackRef.current = [
        ...redoStackRef.current.slice(-(MAX_UNDO_HISTORY - 1)),
        currentData,
      ];
      updateUndoRedoDepth();
      syncDerivedFormState(pendingUndoBase);
      formDataRef.current = pendingUndoBase;
      setFormDataState(pendingUndoBase);
      return;
    }

    const previousData = undoStackRef.current.pop();
    if (!previousData) return;

    redoStackRef.current = [
      ...redoStackRef.current.slice(-(MAX_UNDO_HISTORY - 1)),
      currentData,
    ];
    updateUndoRedoDepth();
    syncDerivedFormState(previousData);
    formDataRef.current = previousData;
    setFormDataState(previousData);
  }, [clearPendingUndoTimer, syncDerivedFormState, updateUndoRedoDepth]);

  const redoFormChange = useCallback(() => {
    commitPendingUndoHistory();
    const currentData = formDataRef.current;
    const nextData = redoStackRef.current.pop();
    if (!nextData) return;

    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO_HISTORY - 1)),
      currentData,
    ];
    updateUndoRedoDepth();
    syncDerivedFormState(nextData);
    formDataRef.current = nextData;
    setFormDataState(nextData);
  }, [commitPendingUndoHistory, syncDerivedFormState, updateUndoRedoDepth]);

  useEffect(() => {
    return () => {
      clearPendingUndoTimer();
    };
  }, [clearPendingUndoTimer]);

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
  const isDirty = (currentConversions: PackageConversion[] = []): boolean => {
    if (!initialFormData) return false;

    const formDataChanged =
      JSON.stringify(formData) !== JSON.stringify(initialFormData);

    // Compare unit conversions if provided
    type ConversionForCompare = {
      inventory_unit_id: string;
      parent_inventory_unit_id: string | null;
      to_unit_id: string;
      conversion_rate: number;
      base_price_override: number | null;
      sell_price_override: number | null;
    };

    const mapConversionForComparison = (
      conv: PackageConversion
    ): ConversionForCompare | null => {
      const unitId = conv?.unit?.id || conv?.to_unit_id;
      if (!conv || !unitId) return null;
      return {
        inventory_unit_id: conv.inventory_unit_id || conv.to_unit_id || unitId,
        parent_inventory_unit_id: conv.parent_inventory_unit_id || null,
        to_unit_id: unitId,
        conversion_rate: conv.factor_to_base || conv.conversion_rate || 1,
        base_price_override:
          conv.base_price_override ?? conv.base_price ?? null,
        sell_price_override:
          conv.sell_price_override ?? conv.sell_price ?? null,
      };
    };

    const currentConversionsForCompare = currentConversions
      .map(mapConversionForComparison)
      .filter(Boolean) as ConversionForCompare[];

    const initialConversionsForCompare = Array.isArray(
      initialPackageConversions
    )
      ? (initialPackageConversions
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
      manufacturer_id: '',
      type_id: '',
      category_id: '',
      package_id: '',
      base_inventory_unit_id: '',
      dosage_id: '',
      barcode: '',
      description: '',
      base_price: 0,
      sell_price: 0,
      is_level_pricing_active: true,
      min_stock: 10,
      quantity: 0,
      unit_id: '',
      measurement_denominator_value: null,
      measurement_denominator_unit_id: '',
      is_active: true,
      is_medicine: true,
      has_expiry_date: false,
      updated_at: null,
      customer_level_discounts: [],
    };

    const normalizedInitialState = {
      ...initialState,
      customer_level_discounts:
        initialState.customer_level_discounts ??
        ([] as ItemFormData['customer_level_discounts']),
    };

    setFormData(normalizedInitialState);
    setInitialFormData(normalizedInitialState);
    resetUndoRedoHistory();

    syncDerivedFormState(normalizedInitialState);
  };

  /**
   * Resets form to initial state
   */
  const resetForm = () => {
    if (isEditMode && initialFormData && initialPackageConversions) {
      applyFormData({ ...initialFormData });
    } else {
      setInitialDataForForm();
    }
  };

  return {
    // Core form state
    formData,
    setFormData,
    updateFormData,
    undoFormChange,
    redoFormChange,
    canUndo: undoDepth > 0 || hasPendingUndo,
    canRedo: redoDepth > 0,

    // Initial state tracking
    initialFormData,
    setInitialFormData,
    initialPackageConversions,
    setInitialPackageConversions,

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
    isAddManufacturerModalOpen,
    setIsAddManufacturerModalOpen,
    persistedDropdownName,
    setPersistedDropdownName,
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
    packages,
    setPackages,
    units,
    setUnits,
    dosages,
    setDosages,
    manufacturers,
    setManufacturers,

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
