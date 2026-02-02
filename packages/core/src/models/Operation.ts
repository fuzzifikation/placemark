/**
 * Operation models - platform-agnostic
 */

export type OperationType = 'copy' | 'move';

export type OperationStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'conflict';

export interface FileOperation {
  id: string; // Unique ID for tracking
  photoId: number; // Database photo ID for path updates
  type: OperationType;
  sourcePath: string;
  destPath: string;
  status: OperationStatus;
  error?: string;
  fileSize: number;
}

export interface DryRunResult {
  operations: FileOperation[];
  summary: {
    totalFiles: number;
    totalSize: number;
    warnings: string[];
  };
}

export interface OperationLogEntry {
  id: number;
  operation: OperationType;
  sourcePath: string;
  destPath: string;
  timestamp: number;
  status: OperationStatus;
  error?: string;
}
