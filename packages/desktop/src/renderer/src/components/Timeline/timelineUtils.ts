/**
 * Timeline utility functions
 */

// Timeline constants
export const MIN_RANGE_GAP_MS = 1000; // Minimum 1 second gap between start and end
export const DEBOUNCE_DELAY_MS = 100; // Debounce delay for range change notifications

import { formatDateWithOptions } from '../../utils/formatLocale';

/**
 * Format timestamp for display
 */
export function formatDate(timestamp: number): string {
  return formatDateWithOptions(timestamp, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Convert position (0-1) to timestamp
 */
export function positionToTimestamp(position: number, minDate: number, maxDate: number): number {
  return minDate + position * (maxDate - minDate);
}

/**
 * Convert timestamp to position (0-1)
 */
export function timestampToPosition(timestamp: number, minDate: number, maxDate: number): number {
  return (timestamp - minDate) / (maxDate - minDate);
}
