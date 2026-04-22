/**
 * Operation models - platform-agnostic
 */

export type OperationType = 'copy' | 'move' | 'delete';

export type OperationStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'conflict'
  | 'delete-source'; // move only: file already at dest, source will be trashed

// Batch-level statuses used by the desktop app's operation history/undo system.
// Keeping them in core avoids type drift between core/desktop.
// Intentionally explicit (not derived from OperationStatus) — batches should
// never be 'skipped' or 'conflict', and the DB CHECK constraint enforces this.
export type BatchStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'undone' | 'archived';

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
