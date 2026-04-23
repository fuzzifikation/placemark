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

/**
 * Canonical path normaliser for case/separator-insensitive comparison.
 *
 * - Unifies separators to `/`.
 * - Collapses repeated slashes.
 * - Strips a trailing slash (but keeps a bare `/`).
 * - Lowercases the whole path.
 *
 * Intentionally platform-agnostic (no Node `path` dependency) so core stays
 * pure. Suitable for prefix comparison AND same-path equality checks.
 *
 * Assumes inputs are already absolute — does NOT resolve `..` or `.`
 * segments. Callers that may receive relative paths must resolve first.
 */
export function normalizePath(p: string): string {
  const unified = p.replace(/\\/g, '/').replace(/\/+/g, '/');
  const trimmed = unified.length > 1 && unified.endsWith('/') ? unified.slice(0, -1) : unified;
  return trimmed.toLowerCase();
}

/**
 * Returns true if two paths refer to the same filesystem location
 * (case- and separator-insensitive). Inputs must be absolute.
 */
export function isSamePath(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

/**
 * Returns true if `destPath` is inside any of the `forbiddenPrefixes`.
 *
 * Comparison is case- and separator-insensitive. Inputs should be absolute.
 * Callers supply platform-specific folders (e.g. userData, %WINDIR%, /System).
 */
export function isForbiddenDestination(destPath: string, forbiddenPrefixes: string[]): boolean {
  const normDest = normalizePath(destPath);
  for (const prefix of forbiddenPrefixes) {
    if (!prefix) continue;
    const normPrefix = normalizePath(prefix);
    if (normDest === normPrefix || normDest.startsWith(normPrefix + '/')) {
      return true;
    }
  }
  return false;
}
