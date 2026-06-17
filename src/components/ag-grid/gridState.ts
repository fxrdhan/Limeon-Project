const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasInitialColumnSizing = (state: unknown): boolean => {
  if (!isRecord(state) || !isRecord(state.columnSizing)) return false;

  const columnSizingModel = state.columnSizing.columnSizingModel;
  return Array.isArray(columnSizingModel) && columnSizingModel.length > 0;
};
