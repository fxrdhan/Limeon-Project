import { describe, expect, it, vi } from 'vite-plus/test';
import type {
  Customer,
  Doctor,
  Patient,
  Supplier,
} from '../../../../../../types/database';
import { normalizeMasterDataAutosaveField } from './autosave';
import {
  getMasterDataCreateMutation,
  getMasterDataDeleteMutation,
  getMasterDataUpdateMutation,
} from './mutations';
import {
  getMasterDataErrorMessage,
  isDuplicateCodeError,
  isForeignKeyDeleteError,
} from './errors';
import { getMasterDataModalPayload } from './modalPayload';
import {
  getIdentityImageUploadPath,
  getIdentityImageUrl,
  getIdentityImageUrlForEntity,
  getSupersededIdentityImagePath,
} from './identityImages';
import { filterMasterDataIdentities } from './filtering';
import type { MasterDataIdentity } from './types';

describe('master-data autosave helpers', () => {
  it('normalizes required text fields and rejects empty required values', () => {
    expect(
      normalizeMasterDataAutosaveField('suppliers', 'name', '  Acme  ')
    ).toEqual({
      key: 'name',
      value: 'Acme',
    });

    expect(
      normalizeMasterDataAutosaveField('suppliers', 'name', '   ')
    ).toBeNull();
  });

  it('maps doctor education to qualification and treats empty nullable fields as null', () => {
    expect(
      normalizeMasterDataAutosaveField('doctors', 'education', '  Sp.PD  ')
    ).toEqual({
      key: 'qualification',
      value: 'Sp.PD',
    });

    expect(
      normalizeMasterDataAutosaveField('doctors', 'education', '')
    ).toEqual({
      key: 'qualification',
      value: null,
    });
  });

  it('normalizes doctor experience years numerically', () => {
    expect(
      normalizeMasterDataAutosaveField('doctors', 'experience_years', '12')
    ).toEqual({
      key: 'experience_years',
      value: 12,
    });

    expect(
      normalizeMasterDataAutosaveField('doctors', 'experience_years', '')
    ).toEqual({
      key: 'experience_years',
      value: null,
    });

    expect(
      normalizeMasterDataAutosaveField('doctors', 'experience_years', 'n/a')
    ).toBeNull();
  });

  it('passes through unknown fields without coercion', () => {
    const value = { nested: true };

    expect(
      normalizeMasterDataAutosaveField('suppliers', 'metadata', value)
    ).toEqual({
      key: 'metadata',
      value,
    });
  });
});

describe('master-data mutation helpers', () => {
  it('selects supported mutation handles by table action family', () => {
    const updateSupplier = {
      mutateAsync: vi.fn(async (payload: unknown) => payload),
    };
    const createDoctor = {
      mutateAsync: vi.fn(async (payload: unknown) => payload),
    };
    const deleteCustomer = { mutateAsync: vi.fn(async (id: unknown) => id) };

    expect(getMasterDataUpdateMutation({ updateSupplier })).toBeDefined();
    expect(getMasterDataCreateMutation({ createDoctor })).toBeDefined();
    expect(getMasterDataDeleteMutation({ deleteCustomer })).toBeDefined();
  });

  it('ignores missing or unsupported mutation handles', () => {
    expect(getMasterDataUpdateMutation(null)).toBeUndefined();
    expect(getMasterDataCreateMutation({ createSupplier: {} })).toBeUndefined();
    expect(
      getMasterDataDeleteMutation({ deleteItem: { mutateAsync: vi.fn() } })
    ).toBeUndefined();
  });

  it('forwards master-data mutation payloads through typed wrappers', async () => {
    const updateSupplier = {
      mutateAsync: vi.fn(async (payload: unknown) => payload),
    };
    const createDoctor = {
      mutateAsync: vi.fn(async (payload: unknown) => payload),
    };
    const deleteCustomer = { mutateAsync: vi.fn(async (id: unknown) => id) };

    await getMasterDataUpdateMutation({ updateSupplier })?.mutateAsync({
      id: 'supplier-1',
      data: { name: 'Acme' },
      options: { silent: true },
    });
    await getMasterDataCreateMutation({ createDoctor })?.mutateAsync({
      name: 'Dr. B',
    });
    await getMasterDataDeleteMutation({ deleteCustomer })?.mutateAsync(
      'customer-1'
    );

    expect(updateSupplier.mutateAsync.mock.calls[0]?.[0]).toEqual({
      id: 'supplier-1',
      data: { name: 'Acme' },
      options: { silent: true },
    });
    expect(createDoctor.mutateAsync.mock.calls[0]?.[0]).toEqual({
      name: 'Dr. B',
    });
    expect(deleteCustomer.mutateAsync.mock.calls[0]?.[0]).toBe('customer-1');
  });
});

describe('master-data modal payload helpers', () => {
  it('builds payloads from only submitted default fields', () => {
    expect(
      getMasterDataModalPayload({
        name: 'Acme',
        description: undefined,
        address: '',
        code: 'SUP-001',
      })
    ).toEqual({
      name: 'Acme',
      address: '',
      code: 'SUP-001',
    });
  });

  it('uses explicit form data instead of default field projection', () => {
    const data = {
      custom: true,
      name: 'Projected elsewhere',
    };

    expect(
      getMasterDataModalPayload({
        name: 'Ignored',
        code: 'IGNORED',
        data,
      })
    ).toBe(data);
  });
});

describe('master-data error helpers', () => {
  it('extracts error messages from supported error shapes', () => {
    expect(
      getMasterDataErrorMessage({
        code: 'PGRST123',
        message: 'Database rejected the request',
      })
    ).toBe('Database rejected the request');

    expect(getMasterDataErrorMessage('Plain failure')).toBe('Plain failure');
  });

  it('detects duplicate-code conflict variants', () => {
    expect(
      isDuplicateCodeError({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      })
    ).toBe(true);

    expect(isDuplicateCodeError('409 conflict: code already exists')).toBe(
      true
    );

    expect(isDuplicateCodeError('network unavailable')).toBe(false);
  });

  it('detects foreign-key delete errors from Error instances', () => {
    expect(
      isForeignKeyDeleteError(new Error('violates foreign key constraint'))
    ).toBe(true);
    expect(isForeignKeyDeleteError('violates foreign key constraint')).toBe(
      false
    );
  });
});

describe('master-data image helpers', () => {
  it('returns usable image urls only when the identity owns a non-empty image_url', () => {
    const supplier: Supplier = {
      id: 'supplier-1',
      name: 'Acme',
      address: null,
      image_url: 'https://example.test/acme.png',
    };
    const customer: Customer = {
      id: 'customer-1',
      name: 'Retail',
      customer_level_id: 'level-1',
    };

    expect(getIdentityImageUrl(supplier)).toBe('https://example.test/acme.png');
    expect(getIdentityImageUrl({ ...supplier, image_url: '   ' })).toBeNull();
    expect(getIdentityImageUrl(customer)).toBeNull();
    expect(getIdentityImageUrl(null)).toBeNull();
  });

  it('builds deterministic image upload paths from entity and file names', () => {
    expect(
      getIdentityImageUploadPath('suppliers', 'supplier-1', 'Logo.PNG')
    ).toBe('suppliers/supplier-1/image.png');
    expect(getIdentityImageUploadPath('doctors', 'doctor-1', '')).toBe(
      'doctors/doctor-1/image.jpg'
    );
  });

  it('prefers the editing identity when resolving an entity image url', () => {
    const staleSupplier: Supplier = {
      id: 'supplier-1',
      name: 'Acme',
      address: null,
      image_url: 'https://example.test/stale.png',
    };
    const editingSupplier: Supplier = {
      ...staleSupplier,
      image_url: 'https://example.test/editing.png',
    };

    expect(
      getIdentityImageUrlForEntity({
        entityId: 'supplier-1',
        editingIdentity: editingSupplier,
        identities: [staleSupplier],
      })
    ).toBe('https://example.test/editing.png');
  });

  it('returns only same-entity superseded image paths', () => {
    expect(
      getSupersededIdentityImagePath({
        oldImagePath: 'suppliers/supplier-1/image.png',
        nextImagePath: 'suppliers/supplier-1/image.webp',
        tableName: 'suppliers',
        entityId: 'supplier-1',
      })
    ).toBe('suppliers/supplier-1/image.png');

    expect(
      getSupersededIdentityImagePath({
        oldImagePath: 'suppliers/supplier-1/image.png',
        nextImagePath: 'suppliers/supplier-1/image.png',
        tableName: 'suppliers',
        entityId: 'supplier-1',
      })
    ).toBeNull();

    expect(
      getSupersededIdentityImagePath({
        oldImagePath: 'suppliers/supplier-2/image.png',
        nextImagePath: 'suppliers/supplier-1/image.webp',
        tableName: 'suppliers',
        entityId: 'supplier-1',
      })
    ).toBeNull();
  });
});

describe('master-data filtering helpers', () => {
  const supplierAlpha: Supplier = {
    id: 'supplier-alpha',
    name: 'Alpha Distribution',
    address: null,
    phone: '021-100',
    email: null,
    contact_person: 'Mira',
  };
  const supplierBeta: Supplier = {
    id: 'supplier-beta',
    name: 'Beta Alpha',
    address: 'Bandung',
    phone: '022-200',
    email: 'alpha@example.test',
    contact_person: 'Reno',
  };
  const patient: Patient = {
    id: 'patient-1',
    name: 'Siti Aminah',
    gender: 'Perempuan',
    birth_date: '1990-01-01',
    address: 'Jakarta',
  };
  const doctor: Doctor = {
    id: 'doctor-1',
    name: 'Budi Santoso',
    gender: 'Laki-laki',
    specialization: 'Pediatri',
    license_number: 'SIP-123',
  };
  const customer: Customer = {
    id: 'customer-1',
    name: 'Clinic Member',
    phone: '081234',
    customer_level_id: 'level-1',
  };

  it('returns the original data reference when search is empty', () => {
    const data: MasterDataIdentity[] = [supplierAlpha, supplierBeta];

    expect(
      filterMasterDataIdentities({
        data,
        searchTerm: '',
        tableName: 'suppliers',
      })
    ).toBe(data);
  });

  it('searches table-specific identity fields', () => {
    expect(
      filterMasterDataIdentities({
        data: [supplierAlpha, supplierBeta],
        searchTerm: 'reno',
        tableName: 'suppliers',
      }).map(identity => identity.id)
    ).toEqual(['supplier-beta']);

    expect(
      filterMasterDataIdentities({
        data: [patient],
        searchTerm: '1990',
        tableName: 'patients',
      }).map(identity => identity.id)
    ).toEqual(['patient-1']);

    expect(
      filterMasterDataIdentities({
        data: [doctor],
        searchTerm: 'pediatri',
        tableName: 'doctors',
      }).map(identity => identity.id)
    ).toEqual(['doctor-1']);

    expect(
      filterMasterDataIdentities({
        data: [customer],
        searchTerm: '081',
        tableName: 'customers',
      }).map(identity => identity.id)
    ).toEqual(['customer-1']);
  });

  it('ranks leading name matches above contained name matches', () => {
    expect(
      filterMasterDataIdentities({
        data: [supplierBeta, supplierAlpha],
        searchTerm: 'alp',
        tableName: 'suppliers',
      }).map(identity => identity.id)
    ).toEqual(['supplier-alpha', 'supplier-beta']);
  });
});
