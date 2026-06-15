import { describe, expect, it } from 'vite-plus/test';
import type { EntityConfig } from '../../application/hooks/collections/useEntityManager';
import type { ItemMasterActiveViewFlags } from './itemMasterActiveViewState';
import {
  getItemMasterActiveAddTooltipLabel,
  getItemMasterActiveExportFilename,
  getItemMasterActiveExportTooltipLabel,
  getItemMasterActiveItemsPerPage,
  getItemMasterActivePlaceholder,
  getItemMasterActiveStatus,
  getItemMasterColumnDefs,
  getItemMasterDataConfig,
  getItemMasterRows,
  type ItemMasterActiveViewColumns,
  type ItemMasterActiveViewData,
} from './itemMasterActiveViewState';

const entityConfig: EntityConfig = {
  key: 'categories',
  label: 'Kategori',
  entityName: 'Kategori',
  tableName: 'item_categories',
  addButtonText: 'Tambah Kategori Baru',
  searchPlaceholder: 'Cari kategori',
  nameColumnHeader: 'Nama Kategori',
  noDataMessage: 'Tidak ada kategori',
  searchNoDataMessage: 'Tidak ada kategori dengan kata kunci',
};

const otherMasterDataConfig = {
  entityName: 'Pasien',
  searchPlaceholder: 'Cari pasien',
  exportFilename: 'daftar-pasien',
  noDataMessage: 'Tidak ada pasien',
  searchNoDataMessage: 'Tidak ada pasien dengan kata kunci',
};

const config = {
  entityCurrentConfig: entityConfig,
  otherMasterDataConfig: null,
};

const otherConfig = {
  entityCurrentConfig: null,
  otherMasterDataConfig,
};

const activeViewData = {
  itemsData: [{ id: 'item-1' }],
  entityRows: [{ id: 'entity-1' }],
  customers: [{ id: 'customer-1' }],
  patients: [{ id: 'patient-1' }],
  doctors: [{ id: 'doctor-1' }],
} as unknown as ItemMasterActiveViewData;

const activeViewColumns = {
  entityColumnDefs: [{ field: 'entity.name' }],
  customerColumnDefs: [{ field: 'customer.name' }],
  patientColumnDefs: [{ field: 'patient.name' }],
  doctorColumnDefs: [{ field: 'doctor.name' }],
} satisfies ItemMasterActiveViewColumns;

const baseFlags: ItemMasterActiveViewFlags = {
  isCustomerTab: false,
  isDoctorTab: false,
  isItemEntityTab: false,
  isItemTab: false,
  isOtherMasterTab: false,
  isPatientTab: false,
  isSupplierTab: false,
};

const flags = (
  overrides: Partial<ItemMasterActiveViewFlags>
): ItemMasterActiveViewFlags => ({
  ...baseFlags,
  ...overrides,
});

describe('item master active view state', () => {
  it('selects active master-data rows from the active tab type', () => {
    expect(
      getItemMasterRows(flags({ isItemEntityTab: true }), activeViewData)
    ).toBe(activeViewData.entityRows);
    expect(
      getItemMasterRows(flags({ isCustomerTab: true }), activeViewData)
    ).toBe(activeViewData.customers);
    expect(
      getItemMasterRows(flags({ isPatientTab: true }), activeViewData)
    ).toBe(activeViewData.patients);
    expect(
      getItemMasterRows(flags({ isDoctorTab: true }), activeViewData)
    ).toBe(activeViewData.doctors);
    expect(getItemMasterRows(flags({}), activeViewData)).toEqual([]);
  });

  it('selects active master-data columns from the active tab type', () => {
    expect(
      getItemMasterColumnDefs(
        flags({ isItemEntityTab: true }),
        activeViewColumns
      )
    ).toBe(activeViewColumns.entityColumnDefs);
    expect(
      getItemMasterColumnDefs(flags({ isCustomerTab: true }), activeViewColumns)
    ).toBe(activeViewColumns.customerColumnDefs);
    expect(
      getItemMasterColumnDefs(flags({ isPatientTab: true }), activeViewColumns)
    ).toBe(activeViewColumns.patientColumnDefs);
    expect(
      getItemMasterColumnDefs(flags({ isDoctorTab: true }), activeViewColumns)
    ).toBe(activeViewColumns.doctorColumnDefs);
    expect(getItemMasterColumnDefs(flags({}), activeViewColumns)).toEqual([]);
  });

  it('derives the active master-data config for entity and other tabs', () => {
    expect(
      getItemMasterDataConfig(flags({ isItemEntityTab: true }), config)
    ).toBe(entityConfig);

    expect(
      getItemMasterDataConfig(flags({ isPatientTab: true }), otherConfig)
    ).toEqual({
      entityName: 'Pasien',
      nameColumnHeader: 'Nama',
      searchPlaceholder: 'Cari pasien',
      noDataMessage: 'Tidak ada pasien',
      searchNoDataMessage: 'Tidak ada pasien dengan kata kunci',
    });
  });

  it('derives page size from the active tab type', () => {
    const pagination = {
      itemItemsPerPage: 10,
      entityItemsPerPage: 20,
      customerItemsPerPage: 30,
      patientItemsPerPage: 40,
      doctorItemsPerPage: 50,
    };

    expect(
      getItemMasterActiveItemsPerPage(flags({ isItemTab: true }), pagination)
    ).toBe(10);
    expect(
      getItemMasterActiveItemsPerPage(
        flags({ isItemEntityTab: true }),
        pagination
      )
    ).toBe(20);
    expect(
      getItemMasterActiveItemsPerPage(
        flags({ isSupplierTab: true }),
        pagination
      )
    ).toBe(25);
    expect(
      getItemMasterActiveItemsPerPage(flags({ isPatientTab: true }), pagination)
    ).toBe(40);
  });

  it('derives active toolbar labels and export filenames', () => {
    expect(
      getItemMasterActivePlaceholder(flags({ isItemTab: true }), config)
    ).toBe('Cari item...');
    expect(
      getItemMasterActivePlaceholder(flags({ isSupplierTab: true }), config)
    ).toBe('Cari supplier...');
    expect(
      getItemMasterActivePlaceholder(
        flags({ isPatientTab: true, isOtherMasterTab: true }),
        otherConfig
      )
    ).toBe('Cari pasien');

    expect(
      getItemMasterActiveAddTooltipLabel(
        flags({ isItemEntityTab: true }),
        config
      )
    ).toBe('Tambah Kategori Baru');
    expect(
      getItemMasterActiveAddTooltipLabel(
        flags({ isPatientTab: true, isOtherMasterTab: true }),
        otherConfig
      )
    ).toBe('Tambah Pasien Baru');
    expect(
      getItemMasterActiveExportTooltipLabel(
        flags({ isPatientTab: true, isOtherMasterTab: true }),
        otherConfig
      )
    ).toBe('Export Data Pasien');
    expect(
      getItemMasterActiveExportFilename(
        'patients',
        flags({ isPatientTab: true, isOtherMasterTab: true }),
        otherConfig
      )
    ).toBe('daftar-pasien');
    expect(
      getItemMasterActiveExportFilename(
        'categories',
        flags({ isItemEntityTab: true }),
        config
      )
    ).toBe('kategori-item');
  });

  it('selects status from the active tab type', () => {
    const status = {
      items: { isLoading: true, isError: false, error: null },
      suppliers: { isLoading: false, isError: true, error: 'supplier' },
      customers: { isLoading: false, isError: true, error: 'customer' },
      patients: { isLoading: false, isError: true, error: 'patient' },
      doctors: { isLoading: false, isError: true, error: 'doctor' },
      entity: { isLoading: false, isError: true, error: 'entity' },
    };

    expect(getItemMasterActiveStatus(flags({ isItemTab: true }), status)).toBe(
      status.items
    );
    expect(
      getItemMasterActiveStatus(flags({ isSupplierTab: true }), status)
    ).toBe(status.suppliers);
    expect(
      getItemMasterActiveStatus(flags({ isDoctorTab: true }), status)
    ).toBe(status.doctors);
    expect(getItemMasterActiveStatus(flags({}), status)).toBe(status.entity);
  });
});
