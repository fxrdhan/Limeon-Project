import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState } from '../types';
import type { BadgeConfig } from '../types/badge';
import SearchBadge from './SearchBadge';

const useBadgeBuilderMock = vi.hoisted(() => vi.fn());
const tokenizeGroupPatternMock = vi.hoisted(() => vi.fn());
const badgeRenderMock = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useBadgeBuilder', () => ({
  useBadgeBuilder: useBadgeBuilderMock,
}));

vi.mock('../utils/groupPatternUtils', () => ({
  tokenizeGroupPattern: tokenizeGroupPatternMock,
}));

vi.mock('./Badge', () => ({
  default: ({ config }: { config: BadgeConfig }) => {
    badgeRenderMock(config);
    return <div data-testid={`badge-${config.id}`}>{config.label}</div>;
  },
}));

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

const buildRawBadges = (): BadgeConfig[] => [
  {
    id: 'condition-0-column',
    type: 'column',
    label: 'Nama',
    onClear: vi.fn(),
    canClear: true,
    onEdit: vi.fn(),
    canEdit: true,
  },
  {
    id: 'condition-0-operator',
    type: 'operator',
    label: 'contains',
    onClear: vi.fn(),
    canClear: true,
    onEdit: vi.fn(),
    canEdit: true,
  },
];

describe('SearchBadge', () => {
  beforeEach(() => {
    useBadgeBuilderMock.mockReset();
    tokenizeGroupPatternMock.mockReset();
    badgeRenderMock.mockReset();
    tokenizeGroupPatternMock.mockReturnValue([{ type: 'other' }]);
    useBadgeBuilderMock.mockReturnValue(buildRawBadges());
  });

  it('uses preserved mode by default and switches for join selector mode', () => {
    const preserved = baseSearchMode({
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: {
          field: 'name',
          headerName: 'Nama',
          searchable: true,
          type: 'text',
        },
        isExplicitOperator: true,
      },
    });

    const current = baseSearchMode();

    const { rerender } = render(
      <SearchBadge
        value="#name"
        searchMode={current}
        preservedSearchMode={preserved}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
      />
    );

    expect(useBadgeBuilderMock.mock.calls[0][0]).toBe(preserved);

    rerender(
      <SearchBadge
        value="#name"
        searchMode={baseSearchMode({ showJoinOperatorSelector: true })}
        preservedSearchMode={preserved}
        preserveBadgesOnJoinSelector={false}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
      />
    );

    expect(useBadgeBuilderMock.mock.calls[1][0]).toMatchObject({
      showJoinOperatorSelector: true,
    });
  });

  it('applies preview labels in edit mode for targeted badge', () => {
    render(
      <SearchBadge
        value="#name"
        searchMode={baseSearchMode({
          showColumnSelector: true,
        })}
        preservedSearchMode={baseSearchMode()}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
        previewColumn={{ headerName: 'Harga', field: 'price' }}
        editingConditionIndex={0}
        editingTarget="column"
      />
    );

    const renderedConfig = badgeRenderMock.mock.calls[0][0] as BadgeConfig;
    expect(renderedConfig.label).toBe('Harga');
  });

  it('injects group badges from tokenized pattern and wires clear callbacks', () => {
    const onGroupTokenClear = vi.fn();
    tokenizeGroupPatternMock.mockReturnValue([
      { type: 'groupOpen' },
      { type: 'other' },
      { type: 'groupClose' },
      { type: 'confirm' },
    ]);

    render(
      <SearchBadge
        value="#( #name #)"
        searchMode={baseSearchMode()}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
        onGroupTokenClear={onGroupTokenClear}
      />
    );

    const configs = badgeRenderMock.mock.calls.map(
      call => call[0] as BadgeConfig
    );
    const openBadge = configs.find(c => c.type === 'groupOpen');
    const closeBadge = configs.find(c => c.type === 'groupClose');

    expect(openBadge).toBeDefined();
    expect(closeBadge).toBeDefined();

    openBadge?.onClear();
    closeBadge?.onClear();

    expect(onGroupTokenClear).toHaveBeenCalledWith('groupOpen', 0);
    expect(onGroupTokenClear).toHaveBeenCalledWith('groupClose', 0);
  });

  it('marks selected badge index and notifies count/list callbacks', () => {
    const onBadgeCountChange = vi.fn();
    const onBadgesChange = vi.fn();

    render(
      <SearchBadge
        value="#name"
        searchMode={baseSearchMode()}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
        selectedBadgeIndex={1}
        onBadgeCountChange={onBadgeCountChange}
        onBadgesChange={onBadgesChange}
      />
    );

    const secondBadge = badgeRenderMock.mock.calls[1][0] as BadgeConfig;
    expect(secondBadge.isSelected).toBe(true);

    expect(onBadgeCountChange).toHaveBeenCalledWith(2);
    expect(onBadgesChange).toHaveBeenCalled();
  });

  it('applies operator preview in edit mode and operator glow selection', () => {
    render(
      <SearchBadge
        value="#name #contains a"
        searchMode={baseSearchMode({ showOperatorSelector: true })}
        preservedSearchMode={baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'a',
            operator: 'contains',
            column: {
              field: 'name',
              headerName: 'Nama',
              searchable: true,
              type: 'text',
            },
            isExplicitOperator: true,
          },
        })}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
        previewOperator={{ value: 'equals', label: 'equals' }}
        editingConditionIndex={0}
        editingTarget="operator"
      />
    );

    const operatorBadge = badgeRenderMock.mock.calls
      .map(call => call[0] as BadgeConfig)
      .find(badge => badge.id === 'condition-0-operator');

    expect(operatorBadge?.label).toBe('equals');
    expect(operatorBadge?.isSelected).toBe(true);
  });

  it('bypasses tokenized merge for grouped filter mode and emits hover callbacks', () => {
    const onHoverChange = vi.fn();
    const groupedMode = baseSearchMode({
      filterSearch: {
        field: 'name',
        value: 'asp',
        operator: 'contains',
        column: {
          field: 'name',
          headerName: 'Nama',
          searchable: true,
          type: 'text',
        },
        isExplicitOperator: true,
        filterGroup: {
          kind: 'group',
          join: 'AND',
          nodes: [],
        },
      },
    });

    const { container } = render(
      <SearchBadge
        value="#( #name #contains asp #)##"
        searchMode={groupedMode}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
        onHoverChange={onHoverChange}
      />
    );

    // grouped mode should return badges directly and skip token merge parsing path
    expect(tokenizeGroupPatternMock).not.toHaveBeenCalled();

    const root = container.querySelector('div.contents') as HTMLElement;
    expect(root).toBeTruthy();
    fireEvent.mouseEnter(root);
    fireEvent.mouseLeave(root);
    expect(onHoverChange).toHaveBeenNthCalledWith(1, true);
    expect(onHoverChange).toHaveBeenNthCalledWith(2, false);
  });

  it('glows join badges when join selector is open in edit mode', () => {
    useBadgeBuilderMock.mockReturnValue([
      ...buildRawBadges(),
      {
        id: 'join-0',
        type: 'join',
        label: 'AND',
      },
    ]);

    render(
      <SearchBadge
        value="#name #contains a #"
        searchMode={baseSearchMode({ showJoinOperatorSelector: true })}
        preservedSearchMode={baseSearchMode({
          filterSearch: {
            field: 'name',
            value: 'a',
            operator: 'contains',
            column: {
              field: 'name',
              headerName: 'Nama',
              searchable: true,
              type: 'text',
            },
            isExplicitOperator: true,
          },
        })}
        badgesContainerRef={{ current: null }}
        clearConditionPart={vi.fn()}
        clearJoin={vi.fn()}
        clearAll={vi.fn()}
        editConditionPart={vi.fn()}
        editJoin={vi.fn()}
        editValueN={vi.fn()}
        editingConditionIndex={0}
        editingTarget="operator"
      />
    );

    const joinBadge = badgeRenderMock.mock.calls
      .map(call => call[0] as BadgeConfig)
      .find(badge => badge.id === 'join-0');
    expect(joinBadge?.isSelected).toBe(true);
  });
});
