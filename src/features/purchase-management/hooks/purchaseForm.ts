import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  recalculateItems,
  computeItemFinancials,
  validatePurchaseForm,
} from './calc';
import type {
  Item,
  Supplier,
  CompanyProfile,
  PurchaseFormData,
  PurchaseItem,
  PackageConversion,
} from '@/types';
import { purchasesService } from '@/services/api/purchases.service';
import { supplierService } from '@/services/api/masterData.service';
import { companyProfileService } from '@/services/api/companyProfile.service';

interface UsePurchaseFormProps {
  initialInvoiceNumber?: string;
  enabled?: boolean;
}

export const usePurchaseForm = ({
  initialInvoiceNumber = '',
}: UsePurchaseFormProps = {}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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

  const total = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

  const fetchCompanyProfile = async () => {
    try {
      const { data, error } = await companyProfileService.getProfile();
      if (error) {
        console.error('Error fetching company profile:', error);
        return;
      }

      if (data) {
        setCompanyProfile(data);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data, error } = await supplierService.getActiveSuppliers();
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchCompanyProfile();
  }, [fetchSuppliers]);

  // Recalculate items when VAT inclusion flag changes to keep subtotals consistent
  useEffect(() => {
    setPurchaseItems(prev => recalculateItems(prev, formData.is_vat_included));
  }, [formData.is_vat_included]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const addItem = (newItem: PurchaseItem) => {
    const itemsWithNewOne = [
      ...purchaseItems,
      {
        ...newItem,
        vat_percentage: newItem.vat_percentage ?? 0,
        batch_no: newItem.batch_no ?? null,
        expiry_date: newItem.expiry_date ?? null,
        unit: newItem.unit || 'Unit',
        unit_conversion_rate: newItem.unit_conversion_rate ?? 1,
      },
    ];
    const recalculatedItems = recalculateItems(
      itemsWithNewOne,
      formData.is_vat_included
    );
    setPurchaseItems(recalculatedItems);
  };

  const updateItem = (
    id: string,
    field: 'quantity' | 'price' | 'discount',
    value: number
  ) => {
    const updatedItems = purchaseItems.map(item => {
      if (item.id === id) {
        const quantity = field === 'quantity' ? value : item.quantity;
        const price = field === 'price' ? value : item.price;
        const discount = field === 'discount' ? value : item.discount;

        let subtotal = quantity * price;
        if (discount > 0) {
          const discountAmount = subtotal * (discount / 100);
          subtotal -= discountAmount;
        }

        if (item.vat_percentage > 0 && !formData.is_vat_included) {
          const vatAmount = subtotal * (item.vat_percentage / 100);
          subtotal += vatAmount;
        }
        return {
          ...item,
          [field]: value,
          subtotal: subtotal,
        };
      }
      return item;
    });

    setPurchaseItems(updatedItems);
  };

  const updateItemVat = (id: string, vatPercentage: number) => {
    const updatedItems = purchaseItems.map(item => {
      if (item.id === id) {
        let subtotal = item.quantity * item.price;
        if (item.discount > 0) {
          const discountAmount = subtotal * (item.discount / 100);
          subtotal -= discountAmount;
        }

        if (vatPercentage > 0 && !formData.is_vat_included) {
          const vatAmount = subtotal * (vatPercentage / 100);
          subtotal += vatAmount;
        }

        return {
          ...item,
          vat_percentage: vatPercentage,
          subtotal: subtotal,
        };
      }
      return item;
    });

    setPurchaseItems(updatedItems);
  };

  const updateItemExpiry = (id: string, expiryDate: string) => {
    setPurchaseItems(
      purchaseItems.map(item =>
        item.id === id ? { ...item, expiry_date: expiryDate } : item
      )
    );
  };

  const updateItemBatchNo = (id: string, batchNo: string) => {
    setPurchaseItems(
      purchaseItems.map(item =>
        item.id === id ? { ...item, batch_no: batchNo } : item
      )
    );
  };

  // removed unused recalculateSubtotal after refactor

  const handleUnitChange = (
    id: string,
    unitName: string,
    getItemByID: (itemId: string) => Item | undefined
  ) => {
    const updatedItems = purchaseItems.map(item => {
      if (item.id === id) {
        const itemData = getItemByID(item.item_id);
        if (!itemData) return item;

        let price = itemData.base_price;
        let conversionRate = 1;

        if (unitName !== itemData.base_unit) {
          const packageConversionsArray = Array.isArray(
            itemData.package_conversions
          )
            ? itemData.package_conversions
            : [];
          const packageConversion = packageConversionsArray.find(
            (uc: PackageConversion) => uc.unit.name === unitName
          );
          if (packageConversion) {
            price =
              packageConversion.base_price ||
              itemData.base_price / packageConversion.conversion_rate;
            conversionRate = packageConversion.conversion_rate;
          }
        }

        const discountAmount = price * item.quantity * (item.discount / 100);

        return {
          ...item,
          unit: unitName,
          price: price,
          subtotal: price * item.quantity - discountAmount,
          unit_conversion_rate: conversionRate,
        };
      }
      return item;
    });

    setPurchaseItems(updatedItems);
  };

  const removeItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  const calculateTotalVat = () => {
    return purchaseItems.reduce(
      (total, item) =>
        total + computeItemFinancials(item, formData.is_vat_included).vatAmount,
      0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePurchaseForm(formData, purchaseItems);
    if (!validation.isValid) {
      const message = [
        ...validation.formErrors,
        ...validation.itemErrors.flatMap(it =>
          it.errors.map(err => `Item ${it.id}: ${err}`)
        ),
      ].join('\n');
      alert(message || 'Form tidak valid.');
      return;
    }

    try {
      setLoading(true);

      const purchaseItemsData = purchaseItems.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        discount: item.discount,
        price: item.price,
        subtotal: item.subtotal,
        unit: item.unit,
        vat_percentage: item.vat_percentage,
        batch_no: item.batch_no,
        expiry_date: item.expiry_date,
      }));

      const { error: purchaseError } =
        await purchasesService.createPurchaseWithItems(
          {
            supplier_id: formData.supplier_id,
            invoice_number: formData.invoice_number,
            date: formData.date,
            total,
            payment_status: formData.payment_status,
            payment_method: formData.payment_method,
            vat_percentage: formData.vat_percentage,
            is_vat_included: formData.is_vat_included,
            vat_amount: calculateTotalVat(),
            notes: formData.notes || null,
            due_date: formData.due_date || null,
            customer_name: companyProfile?.name ?? undefined,
            customer_address: companyProfile?.address ?? undefined,
          },
          purchaseItemsData
        );

      if (purchaseError) throw purchaseError;

      navigate('/purchases');
    } catch (error) {
      console.error('Error creating purchase:', error);
      alert('Gagal menyimpan pembelian. Silakan coba lagi.');
    } finally {
      setLoading(false);
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
