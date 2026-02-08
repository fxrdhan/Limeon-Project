import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState, FilterGroup, SearchColumn } from '../types';
import { useBadgeBuilder } from './useBadgeBuilder';

const getOperatorLabelForColumnMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/operatorUtils', () => ({
  getOperatorLabelForColumn: getOperatorLabelForColumnMock,
}));

type BadgeTarget = 'column' | 'operator' | 'value' | 'valueTo';

const textColumn: SearchColumn = {
  field: 'name',
  headerName: 'Nama',
  searchable: true,
  type: 'text',
};

const numberColumn: SearchColumn = {
  field: 'stock',
  headerName: 'Stok',
  searchable: true,
  type: 'number',
};

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

const createHandlers = () => ({
  clearConditionPart: vi.fn<(index: number, target: BadgeTarget) => void>(),
  clearJoin: vi.fn<(index: number) => void>(),
  clearAll: vi.fn<() => void>(),
  editConditionPart: vi.fn<(index: number, target: BadgeTarget) => void>(),
  editJoin: vi.fn<(index: number) => void>(),
  editValueN: vi.fn<(index: number, target: 'value' | 'valueTo') => void>(),
  insertConditionAfter: vi.fn<(index: number) => void>(),
});

describe('useBadgeBuilder', () => {
  it('returns empty badges when not in any filter/build mode', () => {
    getOperatorLabelForColumnMock.mockReturnValue('contains-label');
    const handlers = createHandlers();

    const { result } = renderHook(() =>
      useBadgeBuilder(baseSearchMode(), handlers)
    );

    expect(result.current).toEqual([]);
  });

  it('builds single-condition inRange badges with inline edit props and handlers', () => {
    getOperatorLabelForColumnMock.mockReturnValue('inRange-label');
    const handlers = createHandlers();

    const searchMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'stock',
        value: '10',
        valueTo: '20',
        operator: 'inRange',
        column: numberColumn,
        isExplicitOperator: true,
        isConfirmed: true,
      },
    });

    const { result } = renderHook(() =>
      useBadgeBuilder(
        searchMode,
        handlers,
        {
          editingBadge: { conditionIndex: 0, field: 'value', value: '11' },
          onInlineValueChange: vi.fn(),
          onInlineEditComplete: vi.fn(),
          onNavigateEdit: vi.fn(),
          onFocusInput: vi.fn(),
        },
        2
      )
    );

    const badges = result.current;
    expect(badges.map(b => b.id)).toEqual([
      'condition-0-column',
      'condition-0-operator',
      'condition-0-value-from',
      'condition-0-separator',
      'condition-0-value-to',
    ]);
    expect(badges[2].isEditing).toBe(true);
    expect(badges[2].editingValue).toBe('11');
    expect(badges[2].isSelected).toBe(true);

    badges[0].onClear();
    badges[1].onEdit?.();
    badges[2].onEdit?.();
    badges[4].onClear();

    expect(handlers.clearConditionPart).toHaveBeenCalledWith(0, 'column');
    expect(handlers.editConditionPart).toHaveBeenCalledWith(0, 'operator');
    expect(handlers.editValueN).toHaveBeenCalledWith(0, 'value');
    expect(handlers.clearConditionPart).toHaveBeenCalledWith(0, 'valueTo');
  });

  it('builds confirmed multi-condition badges including insert and join handlers', () => {
    getOperatorLabelForColumnMock.mockImplementation(
      (_column: SearchColumn, operator: string) => `${operator}-label`
    );
    const handlers = createHandlers();

    const searchMode = baseSearchMode({
      isFilterMode: true,
      showJoinOperatorSelector: true,
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: textColumn,
        isExplicitOperator: true,
        isConfirmed: true,
        isMultiCondition: true,
        conditions: [
          {
            field: 'name',
            column: textColumn,
            operator: 'contains',
            value: 'asp',
          },
          {
            field: 'stock',
            column: numberColumn,
            operator: 'greaterThan',
            value: '5',
          },
        ],
        joins: ['AND'],
      },
    });

    const { result } = renderHook(() => useBadgeBuilder(searchMode, handlers));
    const badges = result.current;

    expect(badges.some(b => b.id === 'condition-1-column')).toBe(true);
    expect(badges.some(b => b.id === 'join-0')).toBe(true);

    const firstValueBadge = badges.find(b => b.id === 'condition-0-value');
    expect(firstValueBadge?.canInsert).toBe(true);
    firstValueBadge?.onInsert?.();
    expect(handlers.insertConditionAfter).toHaveBeenCalledWith(0);

    const joinBadge = badges.find(b => b.id === 'join-0');
    joinBadge?.onEdit?.();
    joinBadge?.onClear();
    expect(handlers.editJoin).toHaveBeenCalledWith(0);
    expect(handlers.clearJoin).toHaveBeenCalledWith(0);
  });

  it('builds partial N-condition badges and omits value when actively typing', () => {
    getOperatorLabelForColumnMock.mockImplementation(
      (_column: SearchColumn, operator: string) => `${operator}-label`
    );
    const handlers = createHandlers();

    const searchMode = baseSearchMode({
      isFilterMode: true,
      activeConditionIndex: 2,
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: textColumn,
        isExplicitOperator: true,
      },
      partialConditions: [
        {
          field: 'name',
          column: textColumn,
          operator: 'contains',
          value: 'asp',
        },
        {
          field: 'stock',
          column: numberColumn,
          operator: 'greaterThan',
          value: '10',
        },
        {
          field: 'stock',
          column: numberColumn,
          operator: 'lessThan',
          value: '50',
        },
      ],
      joins: ['OR', 'AND'],
      partialJoin: 'AND',
    });

    const { result } = renderHook(() => useBadgeBuilder(searchMode, handlers));
    const ids = result.current.map(b => b.id);

    expect(ids).toContain('join-0');
    expect(ids).toContain('condition-1-column');
    expect(ids).toContain('condition-1-value');
    expect(ids).toContain('condition-2-operator');
    expect(ids).not.toContain('condition-2-value');
  });

  it('builds grouped badges with group handlers and group inline editing', () => {
    getOperatorLabelForColumnMock.mockImplementation(
      (_column: SearchColumn, operator: string) => `${operator}-label`
    );
    const handlers = createHandlers();
    const groupHandlers = {
      onEditValue: vi.fn(),
      onEditColumn: vi.fn(),
      onEditOperator: vi.fn(),
      onEditJoin: vi.fn(),
      onClearCondition: vi.fn(),
      onClearGroup: vi.fn(),
    };

    const group: FilterGroup = {
      kind: 'group',
      join: 'AND',
      nodes: [
        {
          kind: 'condition',
          field: 'name',
          column: textColumn,
          operator: 'contains',
          value: 'asp',
        },
        {
          kind: 'group',
          join: 'OR',
          nodes: [
            {
              kind: 'condition',
              field: 'stock',
              column: numberColumn,
              operator: 'inRange',
              value: '10',
              valueTo: '20',
            },
          ],
        },
      ],
      isExplicit: true,
      isClosed: true,
    };

    const searchMode = baseSearchMode({
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: textColumn,
        isExplicitOperator: true,
        filterGroup: group,
      },
    });

    const { result } = renderHook(() =>
      useBadgeBuilder(
        searchMode,
        handlers,
        undefined,
        1,
        {
          editingBadge: { path: [1, 0], field: 'valueTo', value: '21' },
          onInlineValueChange: vi.fn(),
          onInlineEditComplete: vi.fn(),
        },
        groupHandlers
      )
    );

    const badges = result.current;
    expect(badges.some(b => b.id === 'group-open-root')).toBe(true);
    expect(badges.some(b => b.id === 'group-close-root')).toBe(true);
    expect(badges.some(b => b.id === 'join-root-0')).toBe(true);

    const edited = badges.find(b => b.id === 'condition-1-0-value-to');
    expect(edited?.isEditing).toBe(true);
    expect(edited?.editingValue).toBe('21');

    const groupOpen = badges.find(b => b.id === 'group-open-root');
    groupOpen?.onClear();
    expect(groupHandlers.onClearGroup).toHaveBeenCalledWith([]);

    const conditionColumn = badges.find(b => b.id === 'condition-0-column');
    conditionColumn?.onEdit?.();
    expect(groupHandlers.onEditColumn).toHaveBeenCalledWith([0]);
  });
});
