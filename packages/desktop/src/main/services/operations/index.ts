/**
 * Operations service — barrel re-exports.
 *
 * The operations subsystem is split by concern:
 * - cancel:      single-operation guard + cancellation state
 * - execution:   executeOperations (copy/move) and executeDelete
 * - undo:        undoLastBatch, confirmTrashUndo, canUndo
 * - moveFile:    filesystem helpers (moveFileSafely, pathExists)
 * - progress:    progress IPC reporting
 * - messages:    user-facing message formatting
 */

export { CancelledError, requestCancel } from './cancel';
export { executeOperations } from './execution';
export type { ExecutionResult } from './execution';
export { executeDelete } from './deleter';
export { undoLastBatch, confirmTrashUndo, canUndo } from './undo';
export type { BatchInfo } from './undo';
export { generateDryRun } from './dryRun';
