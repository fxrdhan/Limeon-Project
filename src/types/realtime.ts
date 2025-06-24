export interface DeepDiffChange {
  type: "added" | "removed" | "modified";
  path: string[];
  value: unknown;
  oldValue: unknown;
}

export interface DetailedDiff {
  changes: DeepDiffChange[];
  formatted: string;
  summary: string;
}
