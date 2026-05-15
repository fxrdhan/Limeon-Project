import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getInvalidationKeys } from '@/constants/queryKeys';
import { resolveItemUnitEntry } from '@/lib/item-units';
import { salesService } from '@/services/api/sales.service';
import { useCustomers, useDoctors, usePatients } from '@/hooks/queries';
import type {
  Customer,
  Doctor,
  Item,
  Patient,
  SaleFormData,
  SaleItem,
} from '@/types';

const isValidISODate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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

  const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0);

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
    field: 'quantity' | 'price',
    value: number
  ) => {
    setSaleItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const quantity = field === 'quantity' ? value : item.quantity;
        const price = field === 'price' ? value : item.price;

        return {
          ...item,
          [field]: value,
          subtotal: quantity * price,
        };
      })
    );
  };

  const handleUnitChange = (
    id: string,
    unitName: string,
    getItemById: (itemId: string) => Item | undefined
  ) => {
    setSaleItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const itemData = getItemById(item.item_id);
        if (!itemData) return item;

        const selectedUnit =
          resolveItemUnitEntry(
            itemData.inventory_units || [],
            undefined,
            unitName
          ) ||
          resolveItemUnitEntry(
            itemData.inventory_units || [],
            item.inventory_unit_id,
            undefined
          );

        const price = selectedUnit?.sell_price || itemData.sell_price;
        const conversionRate = selectedUnit?.factor_to_base || 1;

        return {
          ...item,
          unit_name: unitName,
          inventory_unit_id:
            selectedUnit?.inventory_unit_id ||
            itemData.base_inventory_unit_id ||
            null,
          unit_id: null,
          price,
          subtotal: price * item.quantity,
          unit_conversion_rate: conversionRate,
        };
      })
    );
  };

  const removeItem = (id: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== id));
  };

  const validateSaleForm = (getItemById: (id: string) => Item | undefined) => {
    const errors: string[] = [];

    if (!formData.date.trim() || !isValidISODate(formData.date)) {
      errors.push('Tanggal penjualan tidak valid (YYYY-MM-DD).');
    }

    if (!formData.payment_method.trim()) {
      errors.push('Metode pembayaran wajib diisi.');
    }

    if (saleItems.length === 0) {
      errors.push('Minimal harus ada satu item penjualan.');
    }

    for (const item of saleItems) {
      if (!item.item_id) errors.push(`${item.item_name}: item tidak valid.`);
      if (!item.unit_name.trim()) {
        errors.push(`${item.item_name}: satuan harus diisi.`);
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        errors.push(`${item.item_name}: kuantitas harus lebih besar dari 0.`);
      }
      if (!Number.isFinite(item.price) || item.price < 0) {
        errors.push(`${item.item_name}: harga tidak boleh negatif.`);
      }
      if (
        !Number.isFinite(item.unit_conversion_rate) ||
        item.unit_conversion_rate <= 0
      ) {
        errors.push(`${item.item_name}: konversi satuan tidak valid.`);
      }

      const itemData = getItemById(item.item_id);
      if (itemData) {
        const requestedStock = item.quantity * item.unit_conversion_rate;
        if (requestedStock > itemData.stock) {
          errors.push(`${item.item_name}: stok tidak mencukupi.`);
        }
      }
    }

    return errors;
  };

  const handleSubmit = async (
    e: React.FormEvent,
    getItemById: (id: string) => Item | undefined
  ) => {
    e.preventDefault();

    const validationErrors = validateSaleForm(getItemById);
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    try {
      setLoading(true);

      const saleItemsData = saleItems.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        unit_name: item.unit_name,
        inventory_unit_id: item.inventory_unit_id,
        unit_id: item.unit_id,
        unit_conversion_rate: item.unit_conversion_rate,
      }));

      const { error } = await salesService.createSaleWithItems(
        {
          customer_id: formData.customer_id || undefined,
          patient_id: formData.patient_id || undefined,
          doctor_id: formData.doctor_id || undefined,
          invoice_number: formData.invoice_number || undefined,
          date: formData.date,
          total,
          payment_method: formData.payment_method,
        },
        saleItemsData
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
