/**
 * Message formatting for operation results.
 */

import { OperationType } from '@placemark/core';

export function plural(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? 's' : ''}`;
}

export function buildExecutionMessage(opts: {
  opType: OperationType;
  completedCount: number;
  skippedCount: number;
  trashedSourceCount: number;
  trashFailures: string[];
  pathUpdateFailures: string[];
}): string {
  const {
    opType,
    completedCount,
    skippedCount,
    trashedSourceCount,
    trashFailures,
    pathUpdateFailures,
  } = opts;

  const skippedMsg = skippedCount > 0 ? ` (${skippedCount} already in destination, skipped)` : '';
  const opLabel = opType === 'copy' ? 'Copied' : 'Moved';

  let message: string;
  if (completedCount > 0 && trashedSourceCount > 0) {
    message = `${opLabel} ${plural(completedCount, 'file')}. ${plural(trashedSourceCount, 'source file')} sent to Recycle Bin (already at destination).${skippedMsg}`;
  } else if (completedCount > 0) {
    message = `Successfully ${opLabel.toLowerCase()} ${plural(completedCount, 'file')}.${skippedMsg}`;
  } else {
    message = `${plural(trashedSourceCount, 'source file')} sent to Recycle Bin — all files were already at the destination.${skippedMsg}`;
  }

  if (pathUpdateFailures.length > 0) {
    message += ` Warning: ${plural(pathUpdateFailures.length, 'photo path')} could not be updated in the database — the files are safe at the destination. Re-scan the destination folder to restore them.`;
  }
  if (trashFailures.length > 0) {
    message += ` Warning: ${plural(trashFailures.length, 'source file')} could not be sent to Recycle Bin: ${trashFailures.join(', ')}.`;
  }

  return message;
}
