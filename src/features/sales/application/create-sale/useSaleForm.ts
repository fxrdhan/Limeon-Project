import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getInvalidationKeys } from '@/constants/queryKeys';
import {
  useCustomers,
  useDoctors,
  usePatients,
} from '@/features/item-management/public/useIdentityData';
import type {
  Customer,
  Doctor,
  Item,
  Patient,
  SaleFormData,
  SaleItem,
} from '@/types';
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
  const customersQuery = useCustomers({ enabled });
  const patientsQuery = usePatients({ enabled });
  const doctorsQuery = useDoctors({ enabled });
  const customers = useMemo(
    () => (customersQuery.data ?? []) as Customer[],
    [customersQuery.data]
  );
  const patients = useMemo(
    () => (patientsQuery.data ?? []) as Patient[],
    [patientsQuery.data]
  );
  const doctors = useMemo(
    () => (doctorsQuery.data ?? []) as Doctor[],
    [doctorsQuery.data]
  );
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
      alert(validationErrors.join('\n'));
      return;
    }

    try {
      setLoading(true);

      const { error } = await createSaleWithItems(
        buildSaleCreatePayload(formData, total),
        buildSaleItemCreatePayloads(saleItems)
      );

      if (error) throw error;

      for (const queryKey of getInvalidationKeys.sales.related()) {
        void queryClient.invalidateQueries({ queryKey });
      }

      void navigate('/sales');
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Gagal menyimpan penjualan. Silakan coba lagi.');
    } finally {
      setLoading(false);
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
