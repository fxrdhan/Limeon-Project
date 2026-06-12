import { describe, expect, it } from 'vite-plus/test';
import { buildEntityCrudMutationPayload } from './entityCrudPayload';

describe('entityCrudPayload', () => {
  it('builds create payloads with only provided optional fields', () => {
    expect(
      buildEntityCrudMutationPayload({
        name: 'Kemasan',
        code: 'PKG',
        description: undefined,
        address: '',
        nci_code: 'NCI-1',
      })
    ).toEqual({
      action: 'create',
      payload: {
        name: 'Kemasan',
        code: 'PKG',
        address: '',
        nci_code: 'NCI-1',
      },
    });
  });

  it('builds update payloads when id is truthy', () => {
    expect(
      buildEntityCrudMutationPayload({
        id: 'entity-1',
        name: 'Produsen',
        address: 'Jakarta',
      })
    ).toEqual({
      action: 'update',
      payload: {
        id: 'entity-1',
        name: 'Produsen',
        address: 'Jakarta',
      },
    });
  });

  it('keeps the previous create path for empty string ids', () => {
    expect(
      buildEntityCrudMutationPayload({
        id: '',
        name: 'Kategori',
      })
    ).toEqual({
      action: 'create',
      payload: {
        name: 'Kategori',
      },
    });
  });
});
