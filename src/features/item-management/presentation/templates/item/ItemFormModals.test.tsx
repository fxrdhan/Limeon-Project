import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemFormModals from './ItemFormModals';

const capturedEntityModals = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);

vi.mock('../entity/EntityModal', () => ({
  default: (props: Record<string, unknown>) => {
    capturedEntityModals.push(props);
    return <div data-testid={`entity-modal-${String(props.entityName)}`} />;
  },
}));

describe('ItemFormModals', () => {
  beforeEach(() => {
    capturedEntityModals.length = 0;
  });

  it('passes modal configuration to all EntityModal instances', () => {
    const onSubmit = vi.fn(async () => undefined);
    const onClose = vi.fn();

    render(
      <ItemFormModals
        categoryModal={{
          isOpen: true,
          onClose,
          onSubmit,
          mutation: { isPending: false },
        }}
        typeModal={{
          isOpen: false,
          onClose,
          onSubmit,
          mutation: { isPending: true },
        }}
        unitModal={{
          isOpen: false,
          onClose,
          onSubmit,
          mutation: { isPending: false },
        }}
        dosageModal={{
          isOpen: true,
          onClose,
          onSubmit,
          mutation: { isPending: false },
        }}
        manufacturerModal={{
          isOpen: true,
          onClose,
          onSubmit,
          mutation: { isPending: true },
        }}
        currentSearchTerm="aspirin"
      />
    );

    expect(capturedEntityModals).toHaveLength(5);
    expect(capturedEntityModals[0]).toMatchObject({
      entityName: 'Kategori',
      isOpen: true,
      isLoading: false,
      initialNameFromSearch: 'aspirin',
    });
    expect(capturedEntityModals[1]).toMatchObject({
      entityName: 'Jenis Item',
      isOpen: false,
      isLoading: true,
    });
    expect(capturedEntityModals[2]).toMatchObject({
      entityName: 'Kemasan',
      isOpen: false,
      isLoading: false,
    });
    expect(capturedEntityModals[3]).toMatchObject({
      entityName: 'Sediaan',
      isOpen: true,
      isLoading: false,
    });
    expect(capturedEntityModals[4]).toMatchObject({
      entityName: 'Produsen',
      isOpen: true,
      isLoading: true,
    });
  });
});
