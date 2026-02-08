import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  advancedFilterModelToSearchPattern,
  deriveSearchPatternFromGridState,
  extractAdvancedFilterModelFromGridState,
} from './advancedFilterToSearchPattern';

const buildGroupedPatternMock = vi.hoisted(() => vi.fn());
const buildConditionPartMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/search-bar/utils/PatternBuilder', () => ({
  PatternBuilder: {
    buildGroupedPattern: buildGroupedPatternMock,
    buildConditionPart: buildConditionPartMock,
  },
}));

describe('advancedFilterToSearchPattern utilities', () => {
  beforeEach(() => {
    buildGroupedPatternMock.mockReset();
    buildConditionPartMock.mockReset();
    buildGroupedPatternMock.mockReturnValue('group-pattern');
    buildConditionPartMock.mockReturnValue('#name #contains aspirin');
  });

  it('returns null for nullish models', () => {
    expect(advancedFilterModelToSearchPattern(null)).toBeNull();
    expect(advancedFilterModelToSearchPattern(undefined)).toBeNull();
  });

  it('converts leaf model into confirmed condition pattern', () => {
    const model = {
      filterType: 'text',
      colId: 'name',
      type: 'contains',
      filter: 'aspirin',
    } as const;

    const pattern = advancedFilterModelToSearchPattern(model as never);

    expect(buildConditionPartMock).toHaveBeenCalledWith(
      'name',
      'contains',
      'aspirin',
      undefined,
      true
    );
    expect(pattern).toBe('#name #contains aspirin##');
  });

  it('handles direct inRange leaf and joined lower/upper range conversion', () => {
    buildConditionPartMock.mockReturnValueOnce('#stock #inRange 10 #to 20');
    const directRange = {
      filterType: 'number',
      colId: 'stock',
      type: 'inRange',
      filter: 10,
      filterTo: 20,
    };

    const directPattern = advancedFilterModelToSearchPattern(
      directRange as never
    );
    expect(directPattern).toBe('#stock #inRange 10 #to 20##');

    buildConditionPartMock.mockReturnValueOnce('#stock #inRange 10 #to 50');
    const joinedRange = {
      filterType: 'join',
      type: 'and',
      conditions: [
        {
          filterType: 'number',
          colId: 'stock',
          type: 'lessThanOrEqual',
          filter: 50,
        },
        {
          filterType: 'number',
          colId: 'stock',
          type: 'greaterThanOrEqual',
          filter: 10,
        },
      ],
    };

    const joinedPattern = advancedFilterModelToSearchPattern(
      joinedRange as never
    );
    expect(joinedPattern).toBe('#stock #inRange 10 #to 50##');
    expect(buildConditionPartMock).toHaveBeenLastCalledWith(
      'stock',
      'inRange',
      '10',
      '50',
      true
    );
  });

  it('builds grouped pattern for join expressions that are not collapsible ranges', () => {
    const joinModel = {
      filterType: 'join',
      type: 'or',
      conditions: [
        {
          filterType: 'text',
          colId: 'name',
          type: 'contains',
          filter: 'amox',
        },
        {
          filterType: 'text',
          colId: 'name',
          type: 'equals',
          filter: 'aspirin',
        },
      ],
    };

    const pattern = advancedFilterModelToSearchPattern(joinModel as never);
    expect(pattern).toBe('group-pattern');
    expect(buildGroupedPatternMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'group',
        join: 'OR',
      }),
      true
    );
  });

  it('returns null when resulting expression has empty field', () => {
    const model = {
      filterType: 'text',
      colId: '',
      type: 'contains',
      filter: 'x',
    };
    expect(advancedFilterModelToSearchPattern(model as never)).toBeNull();
  });

  it('extracts advanced filter model from root or nested grid state', () => {
    const rootModel = { filterType: 'text', colId: 'name', type: 'contains' };
    expect(
      extractAdvancedFilterModelFromGridState({
        advancedFilterModel: rootModel,
      })
    ).toBe(rootModel);

    const nestedModel = { filterType: 'text', colId: 'stock', type: 'equals' };
    expect(
      extractAdvancedFilterModelFromGridState({
        filter: { advancedFilterModel: nestedModel },
      })
    ).toBe(nestedModel);

    expect(extractAdvancedFilterModelFromGridState(null)).toBeNull();
    expect(extractAdvancedFilterModelFromGridState({})).toBeNull();
  });

  it('derives search pattern directly from grid state', () => {
    buildConditionPartMock.mockReturnValue('#name #contains ibuprofen');

    const pattern = deriveSearchPatternFromGridState({
      filter: {
        advancedFilterModel: {
          filterType: 'text',
          colId: 'name',
          type: 'contains',
          filter: 'ibuprofen',
        },
      },
    });

    expect(pattern).toBe('#name #contains ibuprofen##');
  });
});
