import { useCallback, useEffect } from 'react';
import { KEY_CODES } from '../constants';
import { EnhancedSearchState, FilterGroup } from '../types';
import {
  insertGroupCloseToken,
  insertGroupOpenToken,
  removeGroupTokenAtIndex,
} from '../utils/groupPatternUtils';
import { PatternBuilder } from '../utils/PatternBuilder';

const stripTrailingConfirmation = (input: string): string => {
  const trimmed = input.trimEnd();
  return trimmed.endsWith('##') ? trimmed.slice(0, -2).trimEnd() : trimmed;
};

const ensureTrailingHash = (input: string): string => {
  const trimmed = input.trimEnd();
  if (!trimmed) return '#';
  return trimmed.endsWith('#') ? trimmed : `${trimmed} #`;
};

const collapsePatternWhitespace = (input: string): string => {
  return input.replace(/\s{2,}/g, ' ').trimStart();
};

/**
 * Deletes exactly 1 "badge unit" from the end of a raw pattern string.
 *
 * Badge units map to tokens users see:
 * - `#(` / `#)` → "(" / ")"
 * - `#and` / `#or` → join badge
 * - `#field` / `#operator` → column/operator badges
 * - trailing value segment → value badge
 *
 * Confirmation marker `##` is not a badge and is always stripped during deletion
 * to avoid re-applying filters while the user is editing via Delete key.
 */
const deleteLastBadgeUnit = (input: string): string => {
  const hasConfirmation = input.trimEnd().endsWith('##');
  const base = stripTrailingConfirmation(input);
  let working = base.trimEnd();
  if (!working) return '';

  // If selector markers exist, remove them first (invisible badge).
  if (working.endsWith('#')) {
    working = working.replace(/\s*#\s*$/, '').trimEnd();
    if (!working) return '';
  }

  const finalize = (next: string): string => {
    let result = collapsePatternWhitespace(next);
    const trimmedEnd = result.trimEnd();
    if (!trimmedEnd) return '';

    // Ensure join tokens are not merged into the previous value during partial deletion.
    // The parser needs at least one trailing whitespace after `#and/#or` to recognize the join.
    if (/#(?:and|or)$/i.test(trimmedEnd)) {
      result = `${trimmedEnd} `;
    } else {
      result = trimmedEnd;
    }

    const resultTrimmed = result.trimEnd();

    // Preserve confirmation marker if it was present and it's safe to keep it separated.
    // NOTE: Never append `##` after arbitrary hash-tokens like `#contains`, because it would become
    // `#contains##` and break tokenization/parse. It's only safe after:
    // - a value segment (doesn't start with '#')
    // - group close token (`#)`) which tokenizes as `#)` + `##`
    if (hasConfirmation && resultTrimmed) {
      if (resultTrimmed.endsWith('#)')) {
        return `${resultTrimmed}##`;
      }

      const endsWithHashToken = /(?:^|\s)#[^\s#]+$/.test(resultTrimmed);
      if (!endsWithHashToken) {
        return `${resultTrimmed}##`;
      }
    }

    return result;
  };

  // 1) Group close/open tokens as explicit badges.
  if (working.endsWith('#)')) {
    return finalize(working.replace(/\s*#\)\s*$/, ''));
  }
  if (working.endsWith('#(')) {
    return finalize(working.replace(/\s*#\(\s*$/, ''));
  }

  // 2) Trailing hash token (column/operator/join/etc).
  const trailingTokenMatch = working.match(/(?:^|\s)#[^\s#]+$/);
  if (trailingTokenMatch) {
    return finalize(working.replace(/(?:^|\s)#[^\s#]+$/, ''));
  }

  // 3) Trailing value segment (anything after the last hash token).
  const tokenRegex = /#\(|#\)|#[^\s#]+/g;
  let lastToken: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(working)) !== null) {
    lastToken = match;
  }
  if (!lastToken) {
    return '';
  }

  const cutIndex = lastToken.index + lastToken[0].length;
  const prefix = working.slice(0, cutIndex).trimEnd();
  return finalize(prefix);
};

const deleteGroupedPartialTail = (input: string): string | null => {
  const hasGroupTokens = input.includes('#(') || input.includes('#)');
  if (!hasGroupTokens) return null;

  const base = stripTrailingConfirmation(input);
  const normalized = base.replace(/\s+/g, ' ').trimEnd();
  if (!normalized) return null;

  // When a selector is open, patterns may end with a trailing "#" marker that is not
  // rendered as a badge. Treat it as invisible and delete the previous meaningful
  // token (e.g. "#(") instead of getting "stuck" on an unchanged UI.
  if (normalized.endsWith('#')) {
    const withoutMarker = base.replace(/\s*#\s*$/, '').trimEnd();
    if (withoutMarker !== base) {
      return deleteGroupedPartialTail(withoutMarker) ?? withoutMarker;
    }
  }

  if (normalized.endsWith('#(') || normalized.endsWith('#)')) {
    const tokenType = normalized.endsWith('#(') ? 'groupOpen' : 'groupClose';
    const tokenCount = (
      input.match(tokenType === 'groupOpen' ? /#\(/g : /#\)/g) || []
    ).length;
    if (tokenCount > 0) {
      return removeGroupTokenAtIndex(input, tokenType, tokenCount - 1);
    }
  }

  const joinTailMatch = normalized.match(/^(.*)\s+#(?:and|or)\s*(?:#\s*)?$/i);
  if (joinTailMatch) {
    const withoutJoin = joinTailMatch[1]?.trimEnd() ?? '';
    return withoutJoin;
  }

  // Delete trailing value segment (anything after the last hash token)
  const trailingValueMatch = normalized.match(
    /^(.*#(?![()])[^\s#]+)\s+([^#]+)$/
  );
  if (trailingValueMatch) {
    return `${trailingValueMatch[1]} `;
  }

  // Delete trailing hash token (operator/column/etc) and go back to selector state.
  const trailingTokenMatch = normalized.match(/^(.*)\s+#(?![()])[^\s#]+\s*$/);
  if (trailingTokenMatch) {
    const prefix = trailingTokenMatch[1]?.trimEnd() ?? '';
    return ensureTrailingHash(prefix);
  }

  return null;
};

const findLastConditionPath = (
  group: FilterGroup,
  basePath: number[] = []
): number[] | null => {
  for (let i = group.nodes.length - 1; i >= 0; i -= 1) {
    const node = group.nodes[i];
    if (node.kind === 'condition') {
      return [...basePath, i];
    }
    const nestedPath = findLastConditionPath(node, [...basePath, i]);
    if (nestedPath) return nestedPath;
  }
  return null;
};

const removeGroupNodeAtPath = (
  group: FilterGroup,
  path: number[]
): FilterGroup => {
  if (path.length === 0) return group;
  const [index, ...rest] = path;
  const nodes = group.nodes.flatMap((node, idx) => {
    if (idx !== index) return [node];
    if (rest.length === 0) return [];
    if (node.kind !== 'group') return [node];
    const updatedChild = removeGroupNodeAtPath(node, rest);
    if (updatedChild.nodes.length === 0) return [];
    return [{ ...node, nodes: updatedChild.nodes }];
  });
  return { ...group, nodes };
};

// Scalable type for edit targets
type EditValueTarget = 'value' | 'valueTo';

interface UseSearchKeyboardProps {
  value: string;
  searchMode: EnhancedSearchState;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClearSearch?: () => void;
  handleCloseColumnSelector: () => void;
  handleCloseOperatorSelector: () => void;
  handleCloseJoinOperatorSelector?: () => void;
  onClearPreservedState?: () => void;
  // Scalable handlers for N-condition support
  editConditionValue?: (
    conditionIndex: number,
    target: EditValueTarget
  ) => void;
  clearConditionPart?: (
    conditionIndex: number,
    target: 'column' | 'operator' | 'value' | 'valueTo'
  ) => void;
  clearJoin?: (joinIndex: number) => void;
}

export const useSearchKeyboard = ({
  value,
  searchMode,
  onChange,
  onKeyDown,
  onClearSearch,
  handleCloseColumnSelector,
  handleCloseOperatorSelector,
  handleCloseJoinOperatorSelector,
  onClearPreservedState,
  editConditionValue,
  clearConditionPart,
}: UseSearchKeyboardProps) => {
  // When selectors are open, keyboard focus moves away from the main input.
  // Capture Delete globally so users can still delete trailing pattern tokens (e.g. "#(").
  useEffect(() => {
    const isAnySelectorOpen =
      searchMode.showColumnSelector ||
      searchMode.showOperatorSelector ||
      searchMode.showJoinOperatorSelector;

    if (!isAnySelectorOpen) return;

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== KEY_CODES.DELETE) return;

      if (searchMode.showColumnSelector) {
        const trailingJoinWithHash = value.match(/(.*)\s+#(?:and|or)\s+#\s*$/i);
        const trailingJoinNoHash = value.match(/(.*)\s+#(?:and|or)\s*$/i);
        const trailingJoinMatch = trailingJoinWithHash || trailingJoinNoHash;

        if (trailingJoinMatch) {
          e.preventDefault();
          e.stopPropagation();
          const baseFilter = trailingJoinMatch[1].trimEnd();
          const newValue = baseFilter ? `${baseFilter}##` : '';
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }
      }

      if (value.includes('#(') || value.includes('#)')) {
        const nextValue = deleteGroupedPartialTail(value);
        if (nextValue !== null && nextValue !== value) {
          e.preventDefault();
          e.stopPropagation();
          onChange({
            target: { value: nextValue },
          } as React.ChangeEvent<HTMLInputElement>);
          return;
        }
      }

      // Fallback: when a selector is open and focus is away from the input,
      // allow Delete to remove one badge unit from the end of the pattern.
      if (value.trimStart().startsWith('#')) {
        const nextValue = deleteLastBadgeUnit(value);
        if (nextValue !== value) {
          e.preventDefault();
          e.stopPropagation();
          onChange({
            target: { value: nextValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onGlobalKeyDown, {
        capture: true,
      });
    };
  }, [
    onChange,
    searchMode.showColumnSelector,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    value,
  ]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
        // PROTECTION: When modal selector is open, prevent character input to searchbar
        // Let BaseSelector handle all typing for its internal search
        const isModalOpen =
          searchMode.showColumnSelector ||
          searchMode.showOperatorSelector ||
          searchMode.showJoinOperatorSelector;

        const isPatternMode =
          value.trimStart().startsWith('#') ||
          searchMode.showColumnSelector ||
          searchMode.showOperatorSelector ||
          searchMode.showJoinOperatorSelector ||
          searchMode.isFilterMode;

        if ((e.key === '(' || e.key === ')') && isPatternMode) {
          e.preventDefault();
          e.stopPropagation();

          if (e.key === '(') {
            const newValue = insertGroupOpenToken(value);
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          const pendingValue = e.currentTarget.value.trim();
          let baseValue = value;
          if (pendingValue) {
            const trimmedValue = value.trimEnd();
            if (!trimmedValue.endsWith(pendingValue)) {
              const separator = trimmedValue ? ' ' : '';
              baseValue = `${trimmedValue}${separator}${pendingValue}`;
            }
          }

          const newValue = insertGroupCloseToken(baseValue);
          if (newValue) {
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
          }
          return;
        }

        if (isModalOpen) {
          // Allow navigation keys (Arrow, Enter, Escape) - BaseSelector handles these too
          // But prevent character keys from going to the input
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            return;
          }
        }

        if (e.key === KEY_CODES.ESCAPE) {
          if (searchMode.showColumnSelector) {
            handleCloseColumnSelector();
            return;
          } else if (searchMode.showOperatorSelector) {
            handleCloseOperatorSelector();
            return;
          } else if (searchMode.showJoinOperatorSelector) {
            handleCloseJoinOperatorSelector?.();
            return;
          } else if (value && onClearSearch) {
            onClearSearch();
            return;
          }
        }

        // Enter key: Confirm filter value (add ## marker)
        if (e.key === KEY_CODES.ENTER) {
          // IMPORTANT: When modal selector is open, let BaseSelector handle Enter key
          // Don't intercept Enter for value confirmation when selector is open
          if (isModalOpen) {
            // Don't prevent default - let BaseSelector handle it
            return;
          }

          // Handle confirmation for any condition after the first (index >= 1)
          const activeIdx = searchMode.activeConditionIndex ?? 0;
          const currentPartialCond = searchMode.partialConditions?.[activeIdx];
          const hasOperator = !!currentPartialCond?.operator;

          if (activeIdx > 0 && hasOperator && searchMode.partialJoin) {
            e.preventDefault();
            e.stopPropagation();

            const currentValue = value.trim();

            // Check if current condition has a value being typed
            // (Exclude cases where input ends exactly with the operator badge pattern)
            const opPattern = new RegExp(
              `#${currentPartialCond.operator}\\s*$`
            );
            const hasCondValue = !opPattern.test(currentValue);

            if (
              hasCondValue &&
              !currentValue.endsWith('#') &&
              !currentValue.endsWith('##')
            ) {
              // Special handling for Between (inRange) operator
              if (currentPartialCond.operator === 'inRange') {
                // Check if current condition already has #to marker
                // Pattern: ... #and [#col] #inRange val [#to]
                const inRangeRegex =
                  /#(and|or)\s+(?:#[^\s#]+\s+)?#inRange\s+(.*)$/i;
                const match = currentValue.match(inRangeRegex);
                if (match) {
                  const valPart = match[2].trim();
                  if (!valPart.includes('#to')) {
                    // Check for dash format first
                    const dashMatch = valPart.match(/^(.+?)-(.+)$/);
                    if (
                      dashMatch &&
                      dashMatch[1].trim() &&
                      dashMatch[2].trim()
                    ) {
                      // Confirm with ##
                      onChange({
                        target: { value: currentValue + '##' },
                      } as React.ChangeEvent<HTMLInputElement>);
                      onClearPreservedState?.();
                      return;
                    }
                    // Add #to marker
                    onChange({
                      target: { value: currentValue + ' #to ' },
                    } as React.ChangeEvent<HTMLInputElement>);
                    return;
                  }
                }
              }

              // Confirm pattern
              const newValue = currentValue + '##';
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              onClearPreservedState?.();
            }
            return;
          }

          // Handle single-condition confirmation
          if (searchMode.isFilterMode) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling

            // Only add ## marker if not already confirmed and has value
            if (
              searchMode.filterSearch &&
              !searchMode.filterSearch.isConfirmed &&
              !searchMode.filterSearch.isMultiCondition &&
              searchMode.filterSearch.value.trim() !== ''
            ) {
              // Special handling for Between (inRange) operator: requires both values
              // When only first value exists, transition to "waiting for valueTo" state
              if (
                searchMode.filterSearch.operator === 'inRange' &&
                !searchMode.filterSearch.valueTo
              ) {
                // Check if we're already waiting for valueTo (pattern contains #to marker)
                if (value.includes('#to')) {
                  // Already waiting for second value - don't confirm yet
                  return;
                }

                // IMPORTANT: Check if value contains dash-separated format (e.g., "500-600")
                // If it does, confirm with ## instead of adding #to marker
                // Extract the value part from pattern: "#col #inRange 500-600"
                // Use [^\s#]+ to match field names with dashes, dots, etc. (any char except space and hash)
                const valueMatch = value.match(/#[^\s#]+\s+#inRange\s+(.+)$/i);
                if (valueMatch) {
                  const typedValue = valueMatch[1].trim();
                  // Check if it's a dash-separated format: "500-600"
                  // Simple regex: starts with non-dash chars, has a dash, ends with non-dash chars
                  const dashMatch = typedValue.match(/^(.+?)-(.+)$/);
                  if (dashMatch) {
                    const [, firstVal, secondVal] = dashMatch;
                    // Ensure both parts are non-empty
                    if (firstVal.trim() && secondVal.trim()) {
                      // Has both values in dash format - confirm with ##
                      const currentValue = value.trim();
                      const newValue = currentValue + '##';
                      onChange({
                        target: { value: newValue },
                      } as React.ChangeEvent<HTMLInputElement>);
                      return;
                    }
                  }
                }

                // Add #to marker to transition to "waiting for valueTo" state
                // Pattern: #col #inRange 500 → #col #inRange 500 #to
                // This makes the input area empty after badges, ready for second value
                const currentValue = value.trim();
                const newValue = currentValue + ' #to ';
                onChange({
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLInputElement>);
                return;
              }

              // Build new value with ## marker
              const currentValue = value.trim(); // Trim to avoid trailing spaces

              // Safety check: don't add ## if value already has # at end (which would corrupt pattern)
              if (!currentValue.endsWith('#')) {
                const newValue = currentValue + '##';
                onChange({
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLInputElement>);

                // Clear preserved state after confirming edit
                onClearPreservedState?.();
              }
            }
            return;
          }
        }

        // DELETE key: Used for badge deletion (works even when modal is open)
        // This is separate from Backspace which is used for modal internal search
        if (e.key === KEY_CODES.DELETE) {
          // Sequential badge deletion in pattern/badge mode:
          // Delete removes exactly 1 badge from the far-right each press.
          if (value.trimStart().startsWith('#')) {
            e.preventDefault();
            e.stopPropagation();

            const nextValue = deleteLastBadgeUnit(value);
            if (nextValue !== value) {
              onChange({
                target: { value: nextValue },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }

          if (
            searchMode.showColumnSelector &&
            (value.includes('#(') || value.includes('#)'))
          ) {
            const trimmedValue = value.trimEnd();
            const lastTokenIsOpen = trimmedValue.endsWith('#(');
            const lastTokenIsClose = trimmedValue.endsWith('#)');
            const tokenType = lastTokenIsOpen
              ? 'groupOpen'
              : lastTokenIsClose
                ? 'groupClose'
                : null;

            if (tokenType) {
              const tokenCount = (
                trimmedValue.match(
                  tokenType === 'groupOpen' ? /#\(/g : /#\)/g
                ) || []
              ).length;

              if (tokenCount > 0) {
                e.preventDefault();
                const nextValue = removeGroupTokenAtIndex(
                  value,
                  tokenType,
                  tokenCount - 1
                );
                onChange({
                  target: { value: nextValue },
                } as React.ChangeEvent<HTMLInputElement>);
                return;
              }
            }
          }

          if (searchMode.showColumnSelector) {
            const trailingJoinWithHash = value.match(
              /(.*)\s+#(?:and|or)\s+#\s*$/i
            );
            const trailingJoinNoHash = value.match(/(.*)\s+#(?:and|or)\s*$/i);
            const trailingJoinMatch =
              trailingJoinWithHash || trailingJoinNoHash;

            if (trailingJoinMatch) {
              e.preventDefault();
              const baseFilter = trailingJoinMatch[1].trimEnd();
              const newValue = baseFilter ? `${baseFilter}##` : '';
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          }

          if (value.includes('#)')) {
            const trimmedValue = value.trimEnd();
            const hasConfirmation = trimmedValue.endsWith('##');
            const baseValue = hasConfirmation
              ? trimmedValue.slice(0, -2).trimEnd()
              : trimmedValue;

            if (baseValue.endsWith('#)')) {
              const tokenCount = (value.match(/#\)/g) || []).length;
              if (tokenCount > 0) {
                e.preventDefault();
                const nextValue = removeGroupTokenAtIndex(
                  value,
                  'groupClose',
                  tokenCount - 1
                );
                onChange({
                  target: { value: nextValue },
                } as React.ChangeEvent<HTMLInputElement>);
                return;
              }
            }
          }

          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.filterGroup &&
            searchMode.filterSearch.isConfirmed
          ) {
            const group = searchMode.filterSearch.filterGroup;
            const lastPath = findLastConditionPath(group);
            if (lastPath) {
              e.preventDefault();
              const updatedGroup = removeGroupNodeAtPath(group, lastPath);
              const newValue =
                updatedGroup.nodes.length > 0
                  ? PatternBuilder.buildGroupedPattern(updatedGroup, true)
                  : '';
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          }

          if (
            (value.includes('#(') || value.includes('#)')) &&
            !searchMode.filterSearch?.filterGroup
          ) {
            const nextValue = deleteGroupedPartialTail(value);
            if (nextValue !== null && nextValue !== value) {
              e.preventDefault();
              onChange({
                target: { value: nextValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          }

          // Delete on confirmed multi-condition filter: Enter edit mode for the last condition's valueTo first
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            const conditions = searchMode.filterSearch.conditions || [];

            // FIX: For partial patterns where user is typing a new condition,
            // partialConditions may have more elements than conditions.
            // Use the actual count of all conditions (including the one being typed).
            const partialConditions = searchMode.partialConditions || [];
            const totalConditions = Math.max(
              conditions.length,
              partialConditions.length
            );
            const lastIdx = totalConditions - 1;

            // Get the last condition from either partialConditions or conditions
            const lastCondition =
              partialConditions[lastIdx] || conditions[lastIdx];

            if (lastIdx >= 0 && lastCondition) {
              const hasGroupTokens =
                value.includes('#(') || value.includes('#)');

              // 1. For Between operator with valueTo: Enter edit mode for valueTo first
              // [FIX] Use editConditionValue to enter edit mode instead of clearConditionPart
              if (
                lastCondition.operator === 'inRange' &&
                lastCondition.valueTo
              ) {
                if (editConditionValue) {
                  editConditionValue(lastIdx, 'valueTo');
                } else if (clearConditionPart) {
                  clearConditionPart(lastIdx, 'valueTo');
                }
                return;
              }

              // 2. Delete value if it exists and is non-empty
              // [FIX] For Between operator, enter edit mode for value
              if (lastCondition.value && lastCondition.value.trim() !== '') {
                if (
                  lastCondition.operator === 'inRange' &&
                  editConditionValue
                ) {
                  editConditionValue(lastIdx, 'value');
                } else if (hasGroupTokens && lastCondition.operator) {
                  const trimmedValue = value.trimEnd();
                  const withoutConfirmation = trimmedValue.endsWith('##')
                    ? trimmedValue.slice(0, -2).trimEnd()
                    : trimmedValue;

                  const opToken = `#${lastCondition.operator}`;
                  const lowerValue = withoutConfirmation.toLowerCase();
                  const lowerToken = opToken.toLowerCase();
                  const tokenIndex = lowerValue.lastIndexOf(lowerToken);

                  if (tokenIndex !== -1) {
                    const newValue = `${withoutConfirmation.slice(
                      0,
                      tokenIndex + opToken.length
                    )} `;
                    onChange({
                      target: { value: newValue },
                    } as React.ChangeEvent<HTMLInputElement>);
                    return;
                  }
                } else if (clearConditionPart) {
                  clearConditionPart(lastIdx, 'value');
                }
                return;
              }

              // 3. Delete operator if it exists
              if (lastCondition.operator) {
                clearConditionPart?.(lastIdx, 'operator');
                return;
              }

              // 4. Delete column if it exists
              if (lastCondition.column) {
                clearConditionPart?.(lastIdx, 'column');
                return;
              }
            }
          }

          // Delete on confirmed single-condition filter: Enter in-badge edit mode
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.isConfirmed &&
            !searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            // For Between (inRange) operator with valueTo, enter edit mode for valueTo
            // [FIX] Use editConditionValue to enter edit mode instead of clearConditionPart
            if (
              searchMode.filterSearch.operator === 'inRange' &&
              searchMode.filterSearch.valueTo
            ) {
              if (editConditionValue) {
                editConditionValue(0, 'valueTo');
              } else if (clearConditionPart) {
                clearConditionPart(0, 'valueTo');
              }
              return;
            }
            // For Between operator with only value (no valueTo), enter edit mode for value
            if (
              searchMode.filterSearch.operator === 'inRange' &&
              searchMode.filterSearch.value
            ) {
              if (editConditionValue) {
                editConditionValue(0, 'value');
              } else if (clearConditionPart) {
                clearConditionPart(0, 'value');
              }
              return;
            }
            // For other operators, delete the first/only value
            if (clearConditionPart) {
              clearConditionPart(0, 'value');
            }
            return;
          }

          // Delete on Between operator waiting for valueTo: Enter edit mode for first value
          // This handles the case when user has [Column][Between][Value][to] and presses Delete
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.operator === 'inRange' &&
            searchMode.filterSearch?.waitingForValueTo &&
            searchMode.filterSearch?.value &&
            !searchMode.filterSearch?.isMultiCondition
          ) {
            e.preventDefault();
            if (clearConditionPart) {
              clearConditionPart(0, 'value');
            }
            return;
          }

          // Generalize Step 6: Delete on partial multi-condition removes the last operator and opens operator selector
          // Pattern: ...[Join][Column][Operator] + Delete -> ...[Join][Column] with operator selector open (#)
          const activeIdx = searchMode.activeConditionIndex ?? 0;
          const currentPartialCond = searchMode.partialConditions?.[activeIdx];
          const currentOp = currentPartialCond?.operator;

          if (
            activeIdx > 0 &&
            currentOp &&
            searchMode.partialJoin &&
            !searchMode.isFilterMode
          ) {
            e.preventDefault();

            const hasGroupTokens = value.includes('#(') || value.includes('#)');
            if (hasGroupTokens) {
              const escapedOp = currentOp.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
              );
              const opRegex = new RegExp(`#${escapedOp}\\s*$`, 'i');
              if (opRegex.test(value)) {
                const newValue = value
                  .replace(opRegex, '#')
                  .replace(/\s+$/, ' ');
                onChange({
                  target: { value: newValue },
                } as React.ChangeEvent<HTMLInputElement>);
                return;
              }
            }

            // Use PatternBuilder to reconstruct the pattern up to the current column, then add trailing '#'
            // This ensures the operator selector opens for the current condition.
            const conditions = (searchMode.partialConditions || []).map(c => ({
              field: c.column?.field || c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            }));

            // To "delete" the operator, we clear it from the last condition and use openSelector: true
            if (conditions[activeIdx]) {
              conditions[activeIdx].operator = undefined;
              conditions[activeIdx].value = undefined;
              conditions[activeIdx].valueTo = undefined;
            }

            const newValue = PatternBuilder.buildNConditions(
              conditions,
              searchMode.joins || [],
              searchMode.filterSearch?.isMultiColumn || false,
              searchMode.filterSearch?.column?.field || '',
              {
                confirmed: false,
                openSelector: true,
                stopAfterIndex: activeIdx,
              }
            );

            // Clear preserved state to remove the operator badge from UI
            onClearPreservedState?.();

            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          }

          // D6 Step 3: Remove trailing join operator from confirmed filter
          // Pattern: ... [Value] #join # -> ... [Value]##
          // This handles when user added join operator but wants to remove it and go back to confirmed state
          const trailingJoinRegex = /(.*)\s+#(?:and|or)\s+#\s*$/i;
          if (value.match(trailingJoinRegex)) {
            e.preventDefault();
            // Remove trailing join operator and restore ## marker
            const match = value.match(trailingJoinRegex);
            if (match) {
              const baseFilter = match[1];
              const newValue = `${baseFilter}##`;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }

          // Delete on empty value: Navigate back to operator/column selection
          // Only for single condition filters (multi-condition uses generalized logic above)
          if (
            searchMode.isFilterMode &&
            searchMode.filterSearch?.value === '' &&
            !searchMode.filterSearch?.isMultiCondition
          ) {
            if (
              searchMode.filterSearch.operator === 'contains' &&
              !searchMode.filterSearch.isExplicitOperator
            ) {
              if (onClearSearch) {
                onClearSearch();
              } else {
                onChange({
                  target: { value: '' },
                } as React.ChangeEvent<HTMLInputElement>);
              }
              return;
            } else {
              e.preventDefault();
              const columnName = searchMode.filterSearch.field;
              // Auto-open operator selector when deleting to column
              const newValue = `#${columnName} #`;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          } else if (
            searchMode.showOperatorSelector &&
            searchMode.selectedColumn
          ) {
            e.preventDefault();

            // Generalize: check if this is a subsequent condition's operator selector
            if (
              searchMode.partialJoin &&
              searchMode.activeConditionIndex &&
              searchMode.activeConditionIndex > 0
            ) {
              e.preventDefault();

              const hasGroupTokens =
                value.includes('#(') || value.includes('#)');
              if (hasGroupTokens && searchMode.selectedColumn?.field) {
                const escapedField = searchMode.selectedColumn.field.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  '\\$&'
                );
                const columnRegex = new RegExp(
                  `#${escapedField}\\s*#\\s*$`,
                  'i'
                );
                if (columnRegex.test(value)) {
                  const newValue = value
                    .replace(columnRegex, '#')
                    .replace(/\s+$/, ' ');
                  onChange({
                    target: { value: newValue },
                  } as React.ChangeEvent<HTMLInputElement>);
                  return;
                }
              }

              // Go back to column selector while preserving the join badge
              // Pattern: ...[Join][Column]# -> ...[Join]#
              // This removes the column badge but keeps the join and opens column selector
              const conditions = (searchMode.partialConditions || []).map(
                c => ({
                  field: c.column?.field || c.field,
                  operator: c.operator,
                  value: c.value,
                  valueTo: c.valueTo,
                })
              );

              // Build pattern up to previous condition (confirmed), then add join + # for column selector
              const prevActiveIdx = searchMode.activeConditionIndex - 1;
              const basePattern = PatternBuilder.buildNConditions(
                conditions.slice(0, prevActiveIdx + 1),
                (searchMode.joins || []).slice(0, prevActiveIdx),
                searchMode.filterSearch?.isMultiColumn || false,
                searchMode.filterSearch?.column?.field || '',
                {
                  confirmed: false,
                  openSelector: false, // Don't add trailing # here
                }
              );

              // Preserve the join operator and add trailing # for column selector
              const preservedJoin =
                searchMode.joins?.[prevActiveIdx] ||
                searchMode.partialJoin ||
                'AND';
              const newValue = `${basePattern} #${preservedJoin.toLowerCase()} #`;

              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }

            // Delete on operator selector with only column badge -> clear everything
            if (onClearSearch) {
              onClearSearch();
            } else {
              onChange({
                target: { value: '' },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          } else if (
            searchMode.selectedColumn &&
            !searchMode.showColumnSelector &&
            !searchMode.showOperatorSelector &&
            !searchMode.isFilterMode &&
            value === `#${searchMode.selectedColumn.field}`
          ) {
            if (onClearSearch) {
              onClearSearch();
            } else {
              onChange({
                target: { value: '' },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
          }
        }

        if (
          (searchMode.showColumnSelector ||
            searchMode.showOperatorSelector ||
            searchMode.showJoinOperatorSelector) &&
          (e.key === KEY_CODES.TAB ||
            e.key === KEY_CODES.ARROW_DOWN ||
            e.key === KEY_CODES.ARROW_UP ||
            e.key === KEY_CODES.ENTER)
        ) {
          return;
        }

        // Don't propagate Enter key to parent if in filter mode (already handled above)
        if (e.key === KEY_CODES.ENTER && searchMode.isFilterMode) {
          return;
        }

        onKeyDown?.(e);
      } catch (error) {
        console.error('Error in handleInputKeyDown:', error);
        onKeyDown?.(e);
      }
    },
    [
      searchMode,
      onChange,
      onKeyDown,
      onClearSearch,
      value,
      handleCloseColumnSelector,
      handleCloseOperatorSelector,
      handleCloseJoinOperatorSelector,
      onClearPreservedState,
      editConditionValue,
      clearConditionPart,
    ]
  );

  return {
    handleInputKeyDown,
  };
};
