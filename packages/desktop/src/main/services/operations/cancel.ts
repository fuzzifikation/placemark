/**
 * Single-operation guard and cancellation state.
 *
 * The app runs at most ONE file operation at a time. `executeOperations`
 * and `executeDelete` both acquire this lock; the renderer may request
 * cancellation via `requestCancel`, which is polled at safe points.
 */

export class CancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancelledError';
  }
}

let activeExecution: { cancelRequested: boolean } | null = null;

/**
 * Begin an execution. Throws if one is already in progress.
 */
export function beginExecution(): void {
  if (activeExecution) {
    throw new Error('Another operation is already running. Please wait for it to finish.');
  }
  activeExecution = { cancelRequested: false };
}

export function endExecution(): void {
  activeExecution = null;
}

/**
 * Throws CancelledError if cancel has been requested. Call at safe points
 * between per-file steps.
 */
export function throwIfCancelled(): void {
  if (activeExecution?.cancelRequested) {
    throw new CancelledError('Operation cancelled by user.');
  }
}

export function requestCancel(): { ok: boolean; message: string } {
  if (!activeExecution) {
    return { ok: false, message: 'No operation is currently running.' };
  }
  activeExecution.cancelRequested = true;
  return { ok: true, message: 'Cancel requested. Stopping at next safe point…' };
}
