import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getInvalidationKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import toast from 'react-hot-toast';
import {
  useCustomers,
  useDoctors,
  usePatients,
} from '@/features/item-management/public/useIdentityData';
import type { Item, SaleFormData, SaleItem } from '@/types';
import {
  buildSaleCreatePayload,
  buildSaleItemCreatePayloads,
  calculateSaleTotal,
  updateSaleItemAmount,
  updateSaleItemUnit,
  validateSaleForm,
  type SaleItemAmountField,
} from '../../domain/saleForm';
import { createSaleWithItems } from '../../infrastructure/saleFormData';

interface UseSaleFormProps {
  enabled?: boolean;
}

export const useSaleForm = ({ enabled = true }: UseSaleFormProps = {}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const enabledRef = useRef(enabled);
  const formScopeVersionRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const customersQuery = useCustomers({ enabled });
  const patientsQuery = usePatients({ enabled });
  const doctorsQuery = useDoctors({ enabled });
  const customers = useMemo(
    () => customersQuery.data ?? [],
    [customersQuery.data]
  );
  const patients = useMemo(
    () => patientsQuery.data ?? [],
    [patientsQuery.data]
  );
  const doctors = useMemo(() => doctorsQuery.data ?? [], [doctorsQuery.data]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [formData, setFormData] = useState<SaleFormData>({
    customer_id: '',
    patient_id: '',
    doctor_id: '',
    invoice_number: '',
    date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
  });

  const total = calculateSaleTotal(saleItems);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const addItem = useCallback((newItem: SaleItem) => {
    setSaleItems(prev => [...prev, newItem]);
  }, []);

  const updateItem = (
    id: string,
    field: SaleItemAmountField,
    value: number
  ) => {
    setSaleItems(prev => updateSaleItemAmount(prev, id, field, value));
  };

  const handleUnitChange = (
    id: string,
    unitName: string,
    getItemById: (itemId: string) => Item | undefined
  ) => {
    setSaleItems(prev => updateSaleItemUnit(prev, id, unitName, getItemById));
  };

  const removeItem = (id: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (
    e: React.FormEvent,
    getItemById: (id: string) => Item | undefined
  ) => {
    e.preventDefault();

    const validationErrors = validateSaleForm({
      formData,
      saleItems,
      getItemById,
    });
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join('\n'));
      return;
    }

    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    const scopeVersion = formScopeVersionRef.current;

    try {
      setLoading(true);

      const { error } = await createSaleWithItems(
        buildSaleCreatePayload(formData, total),
        buildSaleItemCreatePayloads(saleItems)
      );

      if (error) throw error;
      if (!isFormScopeActive(scopeVersion)) return;

      void invalidateQueryKeys(
        queryClient,
        getInvalidationKeys.sales.related()
      );

      void navigate('/sales');
    } catch (error) {
      if (!isFormScopeActive(scopeVersion)) return;
      console.error('Error creating sale:', error);
      toast.error('Gagal menyimpan penjualan. Silakan coba lagi.');
    } finally {
      submitInFlightRef.current = false;
      if (isFormScopeActive(scopeVersion)) {
        setLoading(false);
      }
    }
  };

  return {
    formData,
    customers,
    patients,
    doctors,
    saleItems,
    total,
    loading,
    handleChange,
    addItem,
    updateItem,
    handleUnitChange,
    removeItem,
    handleSubmit,
  };
};
