export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ImportJob {
  id: string;
  fileName: string;
  format: 'json' | 'csv';
  totalRecords: number;
  processedRecords: number;
  errors: ValidationError[];
  startedAt: string;
  completedAt?: string;
}

export interface ExportJob {
  id: string;
  format: 'json' | 'csv';
  recordCount: number;
  createdAt: string;
  createdBy: string;
}
