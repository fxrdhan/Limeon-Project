/**
 * Selection Hooks Index
 *
 * Re-exports selection-related utilities from modular hooks.
 */

export {
  getActiveConditionIndex,
  getColumnAt,
  handleColumnSelectMultiColumn,
  handleColumnSelectWithPreservedFilter,
  isBuildingConditionN,
} from './useColumnSelection';

export {
  handleOperatorSelectEditFirst,
  handleOperatorSelectEditSecond,
  handleOperatorSelectNormal,
  handleOperatorSelectSecond,
} from './useOperatorSelection';
