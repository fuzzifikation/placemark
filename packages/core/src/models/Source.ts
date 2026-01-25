/**
 * Source model - represents photo source locations
 * No Node.js or browser dependencies
 */

export type SourceType = 'local' | 'onedrive' | 'network';

export interface Source {
  id: number;
  type: SourceType;
  path: string;
  name: string;
  lastScan: number | null; // Unix epoch in milliseconds
  enabled: boolean;
}

export interface SourceCreateInput {
  type: SourceType;
  path: string;
  name: string;
}

export interface SourceUpdateInput {
  name?: string;
  lastScan?: number;
  enabled?: boolean;
}

/**
 * Get human-readable source type
 */
export function getSourceTypeName(type: SourceType): string {
  switch (type) {
    case 'local':
      return 'Local Folder';
    case 'onedrive':
      return 'OneDrive';
    case 'network':
      return 'Network Share';
  }
}

/**
 * Check if source needs scanning
 */
export function needsScan(source: Source, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  if (!source.enabled) {
    return false;
  }
  if (!source.lastScan) {
    return true;
  }
  return Date.now() - source.lastScan > maxAgeMs;
}
