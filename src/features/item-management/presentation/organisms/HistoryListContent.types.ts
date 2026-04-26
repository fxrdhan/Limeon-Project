export interface HistoryRollbackAction {
  version: number;
  onRollback: () => void;
}
