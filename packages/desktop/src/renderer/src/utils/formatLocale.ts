/**
 * Locale-aware date/number formatting utilities.
 *
 * Chromium derives its locale from the OS *display language* (navigator.language),
 * NOT from the Windows regional-format setting.  So a user with UI=en-US but
 * regional-format=de-DE will see US-style dates unless we ask the main process
 * for the real system locale (app.getSystemLocale()) and pass it explicitly.
 *
 * All UI code should call these helpers instead of raw toLocaleDateString() etc.
 */

/** Cached system locale – resolved once on first use. */
let systemLocale: string | undefined;

/**
 * Fetch the OS regional-format locale from the main process (once).
 * Call this early in app startup (e.g. App.tsx useEffect).
 */
export async function initSystemLocale(): Promise<string> {
  if (systemLocale) return systemLocale;
  try {
    systemLocale = await window.api.system.getSystemLocale();
  } catch {
    // Fallback: let the browser decide
    systemLocale = undefined;
  }
  return systemLocale ?? navigator.language;
}

/**
 * Return the resolved locale (or undefined before init finishes).
 * Passing `undefined` to Intl / toLocale*() falls back to navigator.language,
 * which is acceptable during the brief window before init completes.
 */
export function getSystemLocale(): string | undefined {
  return systemLocale;
}

/** Format a timestamp as a localised date string (e.g. "8.2.2026" for de-DE). */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(systemLocale);
}

/** Format a timestamp as a localised date string with explicit options. */
export function formatDateWithOptions(
  timestamp: number,
  options: Intl.DateTimeFormatOptions
): string {
  return new Date(timestamp).toLocaleDateString(systemLocale, options);
}

/** Format a timestamp as a full localised date+time string. */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(systemLocale);
}

/** Format a number with locale-appropriate grouping (e.g. 1.234 vs 1,234). */
export function formatNumber(value: number): string {
  return value.toLocaleString(systemLocale);
}
