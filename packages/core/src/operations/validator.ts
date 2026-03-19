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

  // Checking if root path is attempted
  if (path.trim() === '/' || path.trim() === '\\') {
    return { valid: false, error: 'Cannot write directly to root' };
  }

  return { valid: true };
}
