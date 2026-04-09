export interface ColumnLayout {
  tableId: string;
  columns: ColumnDef[];
}

export interface ColumnDef {
  key: string;
  visible: boolean;
  order: number;
}

export interface FilterState {
  screenId: string;
  filters: Record<string, unknown>;
  savedAt: string;
}

export interface SearchHistoryEntry {
  query: string;
  timestamp: string;
}

export interface UserPreferences {
  userId: string;
  theme?: string;
  locale?: string;
  customSettings?: Record<string, unknown>;
}
