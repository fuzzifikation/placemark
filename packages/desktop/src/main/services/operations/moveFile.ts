/**
 * Filesystem helpers used by execution, rollback, and undo.
 */

import * as fs from 'fs/promises';
import { constants as fsConstants } from 'fs';

/**
 * Move a file from src to dest.
 *
 * - Tries `rename` first (atomic, instant on same volume).
 * - On EXDEV (cross-device), falls back to COPYFILE_EXCL + unlink.
 *   Node's `copyFile` only resolves after the full write completes, and
 *   COPYFILE_EXCL guarantees we never clobber an existing dest, so no
 *   post-copy verification is required.
 * - Any other error is re-thrown.
 *
 * Destination directory must already exist.
 */
export async function moveFileSafely(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest);
  } catch (err: any) {
    if (err?.code !== 'EXDEV') throw err;
    await fs.copyFile(src, dest, fsConstants.COPYFILE_EXCL);
    await fs.unlink(src);
  }
}

/**
 * Returns true if `p` exists, false if ENOENT, re-throws other errors.
 */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return false;
    throw err;
  }
}
