import { useCallback, useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';

import { createTextColumn } from '@/components/ag-grid';
import type { FieldConfig, Supplier as SupplierType } from '@/types';
import { useSuppliers, useSupplierMutations } from '@/hooks/queries';

export const useSupplierTab = () => {
  const suppliersQuery = useSuppliers({ enabled: true });
  const supplierMutations = useSupplierMutations();

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierType | null>(
    null
  );

  const supplierFields: FieldConfig[] = useMemo(
    () => [
      { key: 'name', label: 'Nama Supplier', type: 'text' },
      { key: 'address', label: 'Alamat', type: 'textarea' },
      { key: 'phone', label: 'Telepon', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'contact_person', label: 'Kontak Person', type: 'text' },
    ],
    []
  );

  const suppliersData: SupplierType[] = useMemo(
    () => (suppliersQuery.data ?? []) as SupplierType[],
    [suppliersQuery.data]
  );

  const supplierColumnDefs: ColDef[] = useMemo(() => {
    const tablePrefix = 'suppliers';
    return [
      createTextColumn({
        field: `${tablePrefix}.name`,
        headerName: 'Nama Supplier',
        minWidth: 200,
        valueGetter: params => params.data?.name || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.address`,
        headerName: 'Alamat',
        minWidth: 150,
        flex: 1,
        valueGetter: params => params.data?.address || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.phone`,
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data?.phone || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.email`,
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data?.email || '-',
      }),
      createTextColumn({
        field: `${tablePrefix}.contact_person`,
        headerName: 'Kontak Person',
        minWidth: 150,
        valueGetter: params => params.data?.contact_person || '-',
      }),
    ];
  }, []);

  const openAddSupplierModal = useCallback(() => {
    setIsAddSupplierModalOpen(true);
  }, []);

  const closeAddSupplierModal = useCallback(() => {
    setIsAddSupplierModalOpen(false);
  }, []);

  const openEditSupplierModal = useCallback((supplier: SupplierType) => {
    setEditingSupplier(supplier);
    setIsEditSupplierModalOpen(true);
  }, []);

  const closeEditSupplierModal = useCallback(() => {
    setIsEditSupplierModalOpen(false);
    setEditingSupplier(null);
  }, []);

  return {
    suppliersQuery,
    supplierMutations,
    supplierFields,
    supplierColumnDefs,
    suppliersData,
    isAddSupplierModalOpen,
    isEditSupplierModalOpen,
    editingSupplier,
    openAddSupplierModal,
    closeAddSupplierModal,
    openEditSupplierModal,
    closeEditSupplierModal,
  };
};
