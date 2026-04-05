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

/** Human-readable label for a MIME type */
export function formatMimeLabel(mimeType: string): string {
  const labels: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/heic': 'HEIC',
    'image/heif': 'HEIF',
    'image/tiff': 'TIFF',
    'image/gif': 'GIF',
    'image/avif': 'AVIF',
    'image/x-canon-cr2': 'CR2 (Canon)',
    'image/x-canon-cr3': 'CR3 (Canon)',
    'image/x-nikon-nef': 'NEF (Nikon)',
    'image/x-nikon-nrw': 'NRW (Nikon)',
    'image/x-sony-arw': 'ARW (Sony)',
    'image/x-adobe-dng': 'DNG',
    'image/x-fuji-raf': 'RAF (Fujifilm)',
    'image/x-olympus-orf': 'ORF (Olympus)',
    'image/x-panasonic-rw2': 'RW2 (Panasonic)',
    'image/x-pentax-pef': 'PEF (Pentax)',
    'image/x-samsung-srw': 'SRW (Samsung)',
    'image/x-leica-rwl': 'RWL (Leica)',
  };
  return labels[mimeType] ?? mimeType;
}

/** Format bytes as KB / MB / GB */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Human-readable relative time ("2 hours ago", "3 days ago") */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}

/** Format a duration in ms as a human-readable span (e.g. "2.3 years", "4 months", "12 days") */
export function formatSpan(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '—';
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) return 'same day';
  if (days < 31) {
    const d = Math.round(days);
    return `${d} day${d !== 1 ? 's' : ''}`;
  }
  const months = days / 30.44; // average days per month
  if (months < 12) {
    const m = Math.round(months);
    return `${m} month${m !== 1 ? 's' : ''}`;
  }
  const years = days / 365.25;
  if (years < 10) {
    const y = Math.round(years * 10) / 10;
    return `${y} year${y !== 1 ? 's' : ''}`;
  }
  const y = Math.round(years);
  return `${y} year${y !== 1 ? 's' : ''}`;
}
