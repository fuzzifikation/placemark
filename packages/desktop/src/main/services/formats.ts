/**
 * Supported image format definitions and helpers.
 * Centralizes all format/extension logic for consistency across services.
 */

/** Standard image formats - JPEG, PNG, HEIC, TIFF, WebP */
export const STANDARD_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'heic',
  'heif',
  'tiff',
  'tif',
  'webp',
] as const;

/** Professional camera RAW formats - 12 formats across major brands */
export const RAW_IMAGE_EXTENSIONS = [
  'cr2', // Canon (older)
  'cr3', // Canon (newer)
  'nef', // Nikon
  'nrw', // Nikon (consumer)
  'arw', // Sony
  'dng', // Adobe/Leica/Google (universal RAW)
  'raf', // Fujifilm
  'orf', // Olympus/OM System
  'rw2', // Panasonic/Lumix
  'pef', // Pentax/Ricoh
  'srw', // Samsung
  'rwl', // Leica
] as const;

/** All supported image extensions (standard + RAW) */
export const ALL_SUPPORTED_EXTENSIONS = [
  ...STANDARD_IMAGE_EXTENSIONS,
  ...RAW_IMAGE_EXTENSIONS,
] as const;

/**
 * Check if a file path is a supported image file.
 * @param filePath - Full path or filename
 * @returns true if the extension is in the supported list (case-insensitive)
 */
export function isSupportedImageFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  return ALL_SUPPORTED_EXTENSIONS.includes(ext as any);
}

/**
 * Check if a file path is a RAW format image.
 * @param filePath - Full path or filename
 * @returns true if the extension is a RAW format (case-insensitive)
 */
export function isRawFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  return RAW_IMAGE_EXTENSIONS.includes(ext as any);
}

/** MIME type lookup for all supported image extensions */
const MIME_TYPES: Record<string, string> = {
  // Standard formats
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.webp': 'image/webp',
  // RAW formats
  '.cr2': 'image/x-canon-cr2',
  '.cr3': 'image/x-canon-cr3',
  '.nef': 'image/x-nikon-nef',
  '.nrw': 'image/x-nikon-nrw',
  '.arw': 'image/x-sony-arw',
  '.dng': 'image/x-adobe-dng',
  '.raf': 'image/x-fuji-raf',
  '.orf': 'image/x-olympus-orf',
  '.rw2': 'image/x-panasonic-rw2',
  '.pef': 'image/x-pentax-pef',
  '.srw': 'image/x-samsung-srw',
  '.rwl': 'image/x-leica-rwl',
};

/**
 * Get MIME type for a file extension.
 * @param ext - Extension with leading dot (e.g. '.jpg')
 * @returns MIME type string, or 'application/octet-stream' for unknown extensions
 */
export function getMimeType(ext: string): string {
  return MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';
}
