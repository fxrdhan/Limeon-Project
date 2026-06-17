import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getInvalidationKeys } from '@/constants/queryKeys';
import toast from 'react-hot-toast';
import {
  recalculateItems,
  validatePurchaseForm,
} from '../../domain/purchaseCalculations';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import type { PurchaseFormChangeEvent } from '../../domain/types';
import type {
  Item,
  CompanyProfile,
  PurchaseFormData,
  PurchaseItem,
} from '@/types';
import {
  useSuppliers,
  useSuppliersSync,
} from '@/features/item-management/public/useSupplierData';
import {
  appendPurchaseItem,
  buildPurchaseCreatePayload,
  buildPurchaseItemCreatePayloads,
  calculatePurchaseTotal,
  calculatePurchaseTotalVat,
  formatPurchaseValidationMessage,
  updatePurchaseItemAmount,
  updatePurchaseItemBatchNo,
  updatePurchaseItemExpiry,
  updatePurchaseItemUnit,
  updatePurchaseItemVat,
  type PurchaseItemAmountField,
} from '../../domain/purchaseForm';
import {
  createPurchaseWithItems,
  fetchPurchaseFormCompanyProfile,
} from '../../infrastructure/purchaseFormData';

interface UsePurchaseFormProps {
  initialInvoiceNumber?: string;
  enabled?: boolean;
}

export const usePurchaseForm = ({
  initialInvoiceNumber = '',
  enabled = true,
}: UsePurchaseFormProps = {}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const formScopeVersionRef = useRef(0);
  const submitInFlightRef = useRef(false);
  useSuppliersSync({ enabled });
  const suppliersQuery = useSuppliers({ enabled });
  const suppliers = useMemo(
    () => suppliersQuery.data ?? [],
    [suppliersQuery.data]
  );
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  const [formData, setFormData] = useState<PurchaseFormData>({
    supplier_id: '',
    invoice_number: initialInvoiceNumber,
    date: new Date().toISOString().slice(0, 10),
    due_date: '',
    payment_status: 'unpaid',
    payment_method: 'cash',
    vat_percentage: 11.0,
    is_vat_included: true,
    notes: '',
  });

  const total = calculatePurchaseTotal(purchaseItems);

  enabledRef.current = enabled;

  const isFormScopeActive = useCallback(
    (scopeVersion: number) =>
      mountedRef.current &&
      enabledRef.current &&
      formScopeVersionRef.current === scopeVersion,
    []
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      formScopeVersionRef.current += 1;
    };
  }, []);

  useEffect(() => {
    formScopeVersionRef.current += 1;

    if (!enabled) {
      setLoading(false);
    }
  }, [enabled]);

  const fetchCompanyProfile = useCallback(async () => {
    const scopeVersion = formScopeVersionRef.current;

    try {
      const { data, error } = await fetchPurchaseFormCompanyProfile();
      if (error) {
        console.error('Error fetching company profile:', error);
        return;
      }

      if (isFormScopeActive(scopeVersion) && data) {
        setCompanyProfile(data);
      }
    } catch (error) {
      if (!isFormScopeActive(scopeVersion)) {
        return;
      }

      console.error('Error fetching company profile:', error);
    }
  }, [isFormScopeActive]);

  useEffect(() => {
    if (!enabled) return;

    void fetchCompanyProfile();
  }, [enabled, fetchCompanyProfile]);

  // Recalculate items when VAT inclusion flag changes to keep subtotals consistent
  useEffect(() => {
    setPurchaseItems(prev => recalculateItems(prev, formData.is_vat_included));
  }, [formData.is_vat_included]);

  const handleChange = (e: PurchaseFormChangeEvent) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? Boolean(checked) : value,
    });
  };

  const addItem = (newItem: PurchaseItem) => {
    setPurchaseItems(prev =>
      appendPurchaseItem(prev, newItem, formData.is_vat_included)
    );
  };

  const updateItem = (
    id: string,
    field: PurchaseItemAmountField,
    value: number
  ) => {
    setPurchaseItems(prev =>
      updatePurchaseItemAmount(prev, id, field, value, formData.is_vat_included)
    );
  };

  const updateItemVat = (id: string, vatPercentage: number) => {
    setPurchaseItems(prev =>
      updatePurchaseItemVat(prev, id, vatPercentage, formData.is_vat_included)
    );
  };

  const updateItemExpiry = (id: string, expiryDate: string) => {
    setPurchaseItems(prev => updatePurchaseItemExpiry(prev, id, expiryDate));
  };

  const updateItemBatchNo = (id: string, batchNo: string) => {
    setPurchaseItems(prev => updatePurchaseItemBatchNo(prev, id, batchNo));
  };

  const handleUnitChange = (
    id: string,
    unitName: string,
    getItemByID: (itemId: string) => Item | undefined
  ) => {
    setPurchaseItems(prev =>
      updatePurchaseItemUnit(prev, id, unitName, getItemByID)
    );
  };

  const removeItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePurchaseForm(formData, purchaseItems);
    if (!validation.isValid) {
      toast.error(formatPurchaseValidationMessage(validation));
      return false;
    }

    if (submitInFlightRef.current) return false;
    submitInFlightRef.current = true;
    const scopeVersion = formScopeVersionRef.current;

    try {
      setLoading(true);

      const { error: purchaseError } = await createPurchaseWithItems(
        buildPurchaseCreatePayload({
          companyProfile,
          formData,
          total,
          vatAmount: calculatePurchaseTotalVat(
            purchaseItems,
            formData.is_vat_included
          ),
        }),
        buildPurchaseItemCreatePayloads(purchaseItems)
      );

      if (purchaseError) throw purchaseError;
      if (!isFormScopeActive(scopeVersion)) return false;

      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.purchases.related()
      );
      void navigate('/purchases');
      return true;
    } catch (error) {
      if (!isFormScopeActive(scopeVersion)) return false;
      console.error('Error creating purchase:', error);
      toast.error('Gagal menyimpan pembelian. Silakan coba lagi.');
      return false;
    } finally {
      submitInFlightRef.current = false;
      if (isFormScopeActive(scopeVersion)) {
        setLoading(false);
      }
    }
  };

  return {
    formData,
    suppliers,
    purchaseItems,
    total,
    loading,
    handleChange,
    addItem,
    updateItem,
    updateItemVat,
    updateItemExpiry,
    updateItemBatchNo,
    handleUnitChange,
    removeItem,
    handleSubmit,
  };
};
