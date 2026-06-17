import { useCallback, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';

import { createTextColumn } from '@/components/ag-grid/columns';
import type { FieldConfig, Supplier as SupplierType } from '@/types';
import {
  useSupplierMutations,
  useSuppliers,
  useSuppliersSync,
} from '@/features/item-management/public/useSupplierData';

const TEXT_ADVANCED_FILTER_COLUMN_PROPS = {
  filter: 'agTextColumnFilter',
  filterParams: {
    filterOptions: [
      'contains',
      'notContains',
      'equals',
      'notEqual',
      'startsWith',
      'endsWith',
    ],
    defaultOption: 'contains',
    suppressAndOrCondition: false,
    caseSensitive: false,
  },
  suppressHeaderFilterButton: true,
} satisfies Partial<ColDef>;

const createAdvancedTextColumn = (
  config: Parameters<typeof createTextColumn>[0]
): ColDef => ({
  ...createTextColumn(config),
  ...TEXT_ADVANCED_FILTER_COLUMN_PROPS,
});

export const useSupplierTab = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  useSuppliersSync({ enabled });
  const suppliersQuery = useSuppliers({ enabled });
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
    () => suppliersQuery.data ?? [],
    [suppliersQuery.data]
  );

  const supplierColumnDefs: ColDef[] = useMemo(() => {
    const tablePrefix = 'suppliers';
    return [
      createAdvancedTextColumn({
        field: `${tablePrefix}.name`,
        headerName: 'Nama Supplier',
        minWidth: 200,
        valueGetter: params => params.data?.name || '-',
      }),
      createAdvancedTextColumn({
        field: `${tablePrefix}.address`,
        headerName: 'Alamat',
        minWidth: 150,
        flex: 1,
        valueGetter: params => params.data?.address || '-',
      }),
      createAdvancedTextColumn({
        field: `${tablePrefix}.phone`,
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data?.phone || '-',
      }),
      createAdvancedTextColumn({
        field: `${tablePrefix}.email`,
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data?.email || '-',
      }),
      createAdvancedTextColumn({
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
