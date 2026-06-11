import { useCallback } from 'react';
import type { JoinOperator } from '../operators';
import type { FilterOperator, SearchColumn } from '../types';

interface UseGroupedSelectionHandlersParams {
  isGroupingActive: boolean;
  handleColumnSelect: (column: SearchColumn) => void;
  handleOperatorSelect: (operator: FilterOperator) => void;
  handleJoinOperatorSelect: (joinOperator: JoinOperator) => void;
  handleGroupEditColumnSelect: (column: SearchColumn) => boolean;
  handleGroupEditOperatorSelect: (operator: FilterOperator) => boolean;
  handleGroupEditJoinSelect: (joinOperator: JoinOperator) => boolean;
  handleGroupColumnSelect: (column: SearchColumn) => void;
  handleGroupOperatorSelect: (operator: FilterOperator) => void;
  handleGroupJoinSelect: (joinOperator: JoinOperator) => void;
}

export const useGroupedSelectionHandlers = ({
  isGroupingActive,
  handleColumnSelect,
  handleOperatorSelect,
  handleJoinOperatorSelect,
  handleGroupEditColumnSelect,
  handleGroupEditOperatorSelect,
  handleGroupEditJoinSelect,
  handleGroupColumnSelect,
  handleGroupOperatorSelect,
  handleGroupJoinSelect,
}: UseGroupedSelectionHandlersParams) => {
  const handleColumnSelectWithGroups = useCallback(
    (column: SearchColumn) => {
      if (handleGroupEditColumnSelect(column)) {
        return;
      }
      if (isGroupingActive) {
        handleGroupColumnSelect(column);
        return;
      }
      handleColumnSelect(column);
    },
    [
      isGroupingActive,
      handleGroupEditColumnSelect,
      handleGroupColumnSelect,
      handleColumnSelect,
    ]
  );

  const handleOperatorSelectWithGroups = useCallback(
    (operator: FilterOperator) => {
      if (handleGroupEditOperatorSelect(operator)) {
        return;
      }
      if (isGroupingActive) {
        handleGroupOperatorSelect(operator);
        return;
      }
      handleOperatorSelect(operator);
    },
    [
      isGroupingActive,
      handleGroupEditOperatorSelect,
      handleGroupOperatorSelect,
      handleOperatorSelect,
    ]
  );

  const handleJoinOperatorSelectWithGroups = useCallback(
    (joinOperator: JoinOperator) => {
      if (handleGroupEditJoinSelect(joinOperator)) {
        return;
      }
      if (isGroupingActive) {
        handleGroupJoinSelect(joinOperator);
        return;
      }
      handleJoinOperatorSelect(joinOperator);
    },
    [
      isGroupingActive,
      handleGroupEditJoinSelect,
      handleGroupJoinSelect,
      handleJoinOperatorSelect,
    ]
  );

  return {
    handleColumnSelectWithGroups,
    handleOperatorSelectWithGroups,
    handleJoinOperatorSelectWithGroups,
  };
};
