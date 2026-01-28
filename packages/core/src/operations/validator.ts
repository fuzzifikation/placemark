/**
 * Path and Operation Validation
 */

/**
 * Check if a destination path looks valid (basic string checks)
 */
export function isValidDestination(path: string): { valid: boolean; error?: string } {
  if (!path || path.trim() === '') {
    return { valid: false, error: 'Path is empty' };
  }
  
  // Basic illegal characters (Windows/Unix mixed)
  // < > : " / \ | ? * are generic bad chars, but : and \ and / are allowed in paths.
  // We mostly care that it's absolute.
  
  // Checking if root path is attempted
  if (path.trim() === '/' || path.trim() === '\\') {
    // Maybe dangerous to write to root
    return { valid: false, error: 'Cannot write directly to root' };
  }

  return { valid: true };
}

/**
 * Check if operation is safe (e.g. not moving into itself)
 */
export function isSafeOperation(source: string, dest: string): boolean {
  // Normalize checking (rough)
  const nSource = source.replace(/\\/g, '/').toLowerCase();
  const nDest = dest.replace(/\\/g, '/').toLowerCase();
  
  if (nSource === nDest) return false;
  
  // Check if dest is inside source (for directories)
  // Not strictly applicable for file copy, but good practice
  if (nDest.startsWith(nSource + '/')) return false;

  return true;
}
