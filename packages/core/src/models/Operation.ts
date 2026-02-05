/**
 * Operation models - platform-agnostic
 */

export type OperationType = 'copy' | 'move';

export type OperationStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'conflict';

// Batch-level statuses used by the desktop app's operation history/undo system.
// Keeping them in core avoids type drift between core/desktop.
export type BatchStatus = OperationStatus | 'undone' | 'archived';

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
