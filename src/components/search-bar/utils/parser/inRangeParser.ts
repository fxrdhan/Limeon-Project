/**
 * Parse inRange (Between) operator values.
 * Supports two formats:
 * - #to marker: "500 #to 700"
 * - Dash separated: "500-700" (only for confirmed values)
 *
 * Note: Space-separated format ("500 700") is NOT supported to allow
 * spaces in filter values (e.g., "para 129" for Contains operator)
 *
 * @param valueString - String containing one or two values
 * @param isConfirmed - Whether this is a confirmed value (has ## or #to marker)
 * @returns Object with value and valueTo, or null if parsing fails
 */
export const parseInRangeValues = (
  valueString: string,
  isConfirmed: boolean = false
): { value: string; valueTo: string } | null => {
  const trimmed = valueString.trim();

  // Check for #to marker pattern: "500 #to 700"
  // This is used when Between operator transitions from typing to confirmed state
  const toMarkerMatch = trimmed.match(/^(.+?)\s+#to\s+(.+)$/i);
  if (toMarkerMatch) {
    const [, fromVal, toVal] = toMarkerMatch;
    if (fromVal.trim() && toVal.trim()) {
      return {
        value: fromVal.trim(),
        valueTo: toVal.trim(),
      };
    }
  }

  // Dash separator (e.g., "500-700")
  // IMPORTANT: Only parse dash format for confirmed values to prevent premature badge creation
  // When user types "500-6", we should NOT create badges until they press Enter
  if (isConfirmed) {
    const dashMatch = trimmed.match(/^(.+?)-(.+)$/);
    if (dashMatch) {
      const [, fromVal, toVal] = dashMatch;
      // Ensure both parts are non-empty after trim
      if (fromVal.trim() && toVal.trim()) {
        return {
          value: fromVal.trim(),
          valueTo: toVal.trim(),
        };
      }
    }
  }

  // Only one value provided - incomplete Between
  return null;
};
