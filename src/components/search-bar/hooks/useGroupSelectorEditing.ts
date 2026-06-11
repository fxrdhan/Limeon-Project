import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { JoinOperator } from '../operators';
import type {
  EnhancedSearchState,
  FilterGroup,
  FilterOperator,
  SearchColumn,
} from '../types';
import {
  findFirstConditionInGroup,
  findGroupNodeAtPath,
  removeGroupNodeAtPath,
  unwrapGroupAtPath,
  updateGroupConditionColumn,
  updateGroupConditionOperator,
  updateGroupJoinAtPath,
} from '../utils/groupEditingUtils';
import {
  removeGroupTokenAtIndex,
  replaceTrailingHash,
} from '../utils/groupPatternUtils';
import { setFilterValue } from '../utils/handlerHelpers';
import { isOperatorCompatibleWithColumn } from '../utils/operatorUtils';
import { PatternBuilder } from '../utils/PatternBuilder';

export interface GroupEditingSelectorTarget {
  path: number[];
  target: 'column' | 'operator' | 'join';
  joinIndex?: number;
}

interface UseGroupSelectorEditingParams {
  value: string;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (state: EnhancedSearchState | null) => void;
  groupEditDraftRef: MutableRefObject<FilterGroup | null>;
  groupEditingSelectorTarget: GroupEditingSelectorTarget | null;
  setGroupEditingSelectorTarget: Dispatch<
    SetStateAction<GroupEditingSelectorTarget | null>
  >;
  applyGroupedPattern: (group: FilterGroup) => void;
  handleClearPreservedState: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  clearAll: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export const useGroupSelectorEditing = ({
  value,
  searchMode,
  preservedSearchMode,
  setPreservedSearchMode,
  groupEditDraftRef,
  groupEditingSelectorTarget,
  setGroupEditingSelectorTarget,
  applyGroupedPattern,
  handleClearPreservedState,
  onChange,
  clearAll,
  inputRef,
}: UseGroupSelectorEditingParams) => {
  const getGroupEditBase = useCallback(() => {
    return (
      groupEditDraftRef.current ||
      preservedSearchMode?.filterSearch?.filterGroup ||
      searchMode.filterSearch?.filterGroup ||
      null
    );
  }, [groupEditDraftRef, preservedSearchMode, searchMode.filterSearch]);

  const handleGroupEditColumn = useCallback(
    (path: number[]) => {
      const group = getGroupEditBase();
      if (!group) return;

      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      groupEditDraftRef.current = group;
      setGroupEditingSelectorTarget({ path, target: 'column' });

      onChange({
        target: { value: '#' },
      } as ChangeEvent<HTMLInputElement>);
    },
    [
      getGroupEditBase,
      groupEditDraftRef,
      preservedSearchMode,
      searchMode,
      onChange,
      setPreservedSearchMode,
      setGroupEditingSelectorTarget,
    ]
  );

  const handleGroupEditOperator = useCallback(
    (path: number[]) => {
      const group = getGroupEditBase();
      if (!group) return;

      const node = findGroupNodeAtPath(group, path);
      if (!node || node.kind !== 'condition') return;

      const columnField = node.field || node.column?.field;
      if (!columnField) return;

      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      groupEditDraftRef.current = group;
      setGroupEditingSelectorTarget({ path, target: 'operator' });

      onChange({
        target: {
          value: PatternBuilder.columnWithOperatorSelector(columnField),
        },
      } as ChangeEvent<HTMLInputElement>);
    },
    [
      getGroupEditBase,
      groupEditDraftRef,
      preservedSearchMode,
      searchMode,
      onChange,
      setPreservedSearchMode,
      setGroupEditingSelectorTarget,
    ]
  );

  const handleGroupEditJoin = useCallback(
    (path: number[], joinIndex: number) => {
      const group = getGroupEditBase();
      if (!group) return;

      const targetNode =
        path.length === 0 ? group : findGroupNodeAtPath(group, path);
      if (!targetNode || targetNode.kind !== 'group') return;

      const firstCondition = findFirstConditionInGroup(targetNode);
      if (!firstCondition) return;

      if (!preservedSearchMode) {
        setPreservedSearchMode(searchMode);
      }

      groupEditDraftRef.current = group;
      setGroupEditingSelectorTarget({ path, target: 'join', joinIndex });

      onChange({
        target: {
          value: PatternBuilder.withJoinSelector(
            firstCondition.field || '',
            firstCondition.operator,
            firstCondition.value,
            firstCondition.valueTo
          ),
        },
      } as ChangeEvent<HTMLInputElement>);
    },
    [
      getGroupEditBase,
      groupEditDraftRef,
      preservedSearchMode,
      searchMode,
      onChange,
      setPreservedSearchMode,
      setGroupEditingSelectorTarget,
    ]
  );

  const handleGroupClearCondition = useCallback(
    (path: number[]) => {
      const group =
        searchMode.filterSearch?.filterGroup ||
        preservedSearchMode?.filterSearch?.filterGroup;
      if (!group) return;
      const updated = removeGroupNodeAtPath(group, path);
      applyGroupedPattern(updated);
    },
    [searchMode.filterSearch, preservedSearchMode, applyGroupedPattern]
  );

  const handleGroupClearGroup = useCallback(
    (path: number[]) => {
      const group =
        searchMode.filterSearch?.filterGroup ||
        preservedSearchMode?.filterSearch?.filterGroup;
      if (!group) return;
      if (path.length === 0) {
        clearAll();
        return;
      }
      const updated = unwrapGroupAtPath(group, path);
      applyGroupedPattern(updated);
    },
    [
      searchMode.filterSearch,
      preservedSearchMode,
      applyGroupedPattern,
      clearAll,
    ]
  );

  const handleGroupTokenClear = useCallback(
    (tokenType: 'groupOpen' | 'groupClose', occurrenceIndex: number) => {
      const nextValue = removeGroupTokenAtIndex(
        value,
        tokenType,
        occurrenceIndex
      );
      if (nextValue === value) return;
      setFilterValue(nextValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  const handleGroupEditColumnSelect = useCallback(
    (column: SearchColumn): boolean => {
      const target = groupEditingSelectorTarget;
      if (!target || target.target !== 'column') return false;

      const baseGroup = getGroupEditBase();
      if (!baseGroup) {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      const updatedGroup = updateGroupConditionColumn(
        baseGroup,
        target.path,
        column
      );
      groupEditDraftRef.current = updatedGroup;

      const node = findGroupNodeAtPath(updatedGroup, target.path);
      if (!node || node.kind !== 'condition') {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        handleClearPreservedState();
        return true;
      }

      if (isOperatorCompatibleWithColumn(column, node.operator)) {
        applyGroupedPattern(updatedGroup);
        handleClearPreservedState();
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      setGroupEditingSelectorTarget({ path: target.path, target: 'operator' });
      onChange({
        target: {
          value: PatternBuilder.columnWithOperatorSelector(column.field),
        },
      } as ChangeEvent<HTMLInputElement>);
      return true;
    },
    [
      groupEditingSelectorTarget,
      getGroupEditBase,
      groupEditDraftRef,
      applyGroupedPattern,
      handleClearPreservedState,
      onChange,
      setGroupEditingSelectorTarget,
    ]
  );

  const handleGroupEditOperatorSelect = useCallback(
    (operator: FilterOperator): boolean => {
      const target = groupEditingSelectorTarget;
      if (!target || target.target !== 'operator') return false;

      const baseGroup = getGroupEditBase();
      if (!baseGroup) {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      const updatedGroup = updateGroupConditionOperator(
        baseGroup,
        target.path,
        operator.value
      );

      applyGroupedPattern(updatedGroup);
      handleClearPreservedState();
      setGroupEditingSelectorTarget(null);
      groupEditDraftRef.current = null;
      return true;
    },
    [
      groupEditingSelectorTarget,
      getGroupEditBase,
      groupEditDraftRef,
      applyGroupedPattern,
      handleClearPreservedState,
      setGroupEditingSelectorTarget,
    ]
  );

  const handleGroupEditJoinSelect = useCallback(
    (joinOp: JoinOperator): boolean => {
      const target = groupEditingSelectorTarget;
      if (!target || target.target !== 'join') return false;

      const baseGroup = getGroupEditBase();
      if (!baseGroup) {
        setGroupEditingSelectorTarget(null);
        groupEditDraftRef.current = null;
        return true;
      }

      const updatedGroup = updateGroupJoinAtPath(
        baseGroup,
        target.path,
        joinOp.value.toUpperCase() as 'AND' | 'OR'
      );

      applyGroupedPattern(updatedGroup);
      handleClearPreservedState();
      setGroupEditingSelectorTarget(null);
      groupEditDraftRef.current = null;
      return true;
    },
    [
      groupEditingSelectorTarget,
      getGroupEditBase,
      groupEditDraftRef,
      applyGroupedPattern,
      handleClearPreservedState,
      setGroupEditingSelectorTarget,
    ]
  );

  const handleGroupColumnSelect = useCallback(
    (column: SearchColumn) => {
      const newValue = replaceTrailingHash(value, `#${column.field} #`);
      setFilterValue(newValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  const handleGroupOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      const newValue = replaceTrailingHash(value, `#${operator.value} `);
      setFilterValue(newValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  const handleGroupJoinSelect = useCallback(
    (joinOp: JoinOperator) => {
      const newValue = replaceTrailingHash(value, `#${joinOp.value} #`);
      setFilterValue(newValue, onChange, inputRef);
    },
    [value, onChange, inputRef]
  );

  return {
    handleGroupEditColumn,
    handleGroupEditOperator,
    handleGroupEditJoin,
    handleGroupClearCondition,
    handleGroupClearGroup,
    handleGroupTokenClear,
    handleGroupEditColumnSelect,
    handleGroupEditOperatorSelect,
    handleGroupEditJoinSelect,
    handleGroupColumnSelect,
    handleGroupOperatorSelect,
    handleGroupJoinSelect,
  };
};
