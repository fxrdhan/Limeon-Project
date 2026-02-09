import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityModal from './EntityModal';

const useConfirmDialogMock = vi.hoisted(() => vi.fn());
const useEntityModalLogicMock = vi.hoisted(() => vi.fn());
const useEntityHistoryMock = vi.hoisted(() => vi.fn());
const providerValues = vi.hoisted(() => [] as unknown[]);
const entityModalContentProps = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);
const comparisonModalProps = vi.hoisted(
  () => [] as Array<Record<string, unknown>>
);

vi.mock('@/components/dialog-box', () => ({
  useConfirmDialog: useConfirmDialogMock,
}));

vi.mock('../../../shared/contexts/EntityModalContext', () => ({
  EntityModalProvider: ({
    value,
    children,
  }: {
    value: unknown;
    children: React.ReactNode;
  }) => {
    providerValues.push(value);
    return <>{children}</>;
  },
}));

vi.mock('../../../application/hooks/instances/useEntityModalLogic', () => ({
  useEntityModalLogic: useEntityModalLogicMock,
}));

vi.mock('../../../application/hooks/instances/useEntityHistory', () => ({
  useEntityHistory: useEntityHistoryMock,
}));

vi.mock('../EntityModalTemplate', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="entity-template">{children}</div>
  ),
}));

vi.mock('./EntityModalContent', () => ({
  default: (props: Record<string, unknown>) => {
    entityModalContentProps.push(props);
    return <div data-testid="entity-content" />;
  },
}));

vi.mock('../comparison', () => ({
  ComparisonModal: (props: Record<string, unknown>) => {
    comparisonModalProps.push(props);
    return <div data-testid="comparison-modal" />;
  },
}));

describe('EntityModal', () => {
  beforeEach(() => {
    useConfirmDialogMock.mockReset();
    useEntityModalLogicMock.mockReset();
    useEntityHistoryMock.mockReset();
    providerValues.length = 0;
    entityModalContentProps.length = 0;
    comparisonModalProps.length = 0;

    useEntityHistoryMock.mockReturnValue({
      history: [{ version_number: 1 }],
      isLoading: false,
      error: null,
    });

    useEntityModalLogicMock.mockReturnValue({
      contextValue: {
        form: {
          code: 'LIVE-CODE',
          name: 'Nama Live',
          description: 'Deskripsi Live',
          address: 'Alamat Live',
        },
        comparison: {
          isOpen: true,
          isClosing: false,
          selectedVersion: { version_number: 2 },
          isDualMode: false,
          versionA: undefined,
          versionB: undefined,
          isFlipped: false,
        },
      },
      nameInputRef: { current: null },
    });
  });

  it('maps entity names to table names and forwards live comparison state', () => {
    const submit = vi.fn(async () => undefined);
    const close = vi.fn();
    const del = vi.fn();

    const cases: Array<[string, string]> = [
      ['Kategori', 'item_categories'],
      ['Jenis Item', 'item_types'],
      ['Kemasan', 'item_packages'],
      ['Sediaan', 'item_dosages'],
      ['Produsen', 'item_manufacturers'],
      ['Unknown', ''],
    ];

    for (const [entityName, expectedTable] of cases) {
      const { unmount } = render(
        <EntityModal
          isOpen={true}
          onClose={close}
          onSubmit={submit}
          initialData={{ id: 'ent-1', name: 'Initial Name' }}
          onDelete={del}
          isLoading={false}
          isDeleting={false}
          entityName={entityName}
        />
      );

      expect(useEntityHistoryMock).toHaveBeenLastCalledWith(
        expectedTable,
        'ent-1'
      );
      expect(useConfirmDialogMock).toHaveBeenCalled();
      expect(entityModalContentProps.at(-1)).toMatchObject({
        initialData: { id: 'ent-1', name: 'Initial Name' },
      });

      const comparisonProps = comparisonModalProps.at(-1);
      expect(comparisonProps).toMatchObject({
        isOpen: true,
        entityName,
        selectedVersion: { version_number: 2 },
      });
      expect(
        (comparisonProps?.currentData as { description: string }).description
      ).toBe(entityName === 'Produsen' ? 'Alamat Live' : 'Deskripsi Live');

      unmount();
    }
  });

  it('uses default entity id fallback and passes prefetched history to logic hook', () => {
    render(
      <EntityModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        onDelete={vi.fn()}
        entityName="Unknown"
        initialNameFromSearch="aspirin"
      />
    );

    expect(useEntityHistoryMock).toHaveBeenCalledWith('', '');
    expect(useEntityModalLogicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialData: null,
        initialNameFromSearch: 'aspirin',
        historyState: {
          data: [{ version_number: 1 }],
          isLoading: false,
          error: null,
        },
      })
    );
    expect(providerValues.at(-1)).toMatchObject({
      form: {
        code: 'LIVE-CODE',
      },
    });
  });
});
