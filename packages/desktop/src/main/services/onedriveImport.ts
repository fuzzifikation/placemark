/**
 * OneDrive photo import service
 * Fetches photo metadata from Microsoft Graph and inserts into the local database.
 * No file content is downloaded — only metadata (GPS, timestamp, camera, size).
 */

import { ONEDRIVE_CONFIG } from '../config/onedrive';
import { OneDriveAuthService } from './onedriveAuth';
import { createPhoto, isDuplicateOneDrivePhoto } from './storage';

export interface OneDriveImportProgress {
  scanned: number;
  imported: number;
  duplicates: number;
  total: number; // running total of image items across all folders seen so far
  currentFile: string;
}

export interface OneDriveImportResult {
  scanned: number;
  imported: number;
  duplicates: number;
}

// ── Graph API response shapes ─────────────────────────────────────────────────

interface GraphItemsPage {
  value?: GraphDriveItem[];
  '@odata.nextLink'?: string;
}

interface GraphDriveItem {
  id?: string;
  name?: string;
  size?: number;
  file?: {
    mimeType?: string;
    hashes?: {
      sha256Hash?: string;
    };
  };
  folder?: {
    childCount?: number; // total immediate children (files + folders)
  };
  photo?: {
    takenDateTime?: string;
    cameraMake?: string;
    cameraModel?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  createdDateTime?: string;
  parentReference?: {
    path?: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isImageItem(item: GraphDriveItem): boolean {
  return item.file?.mimeType?.startsWith('image/') === true;
}

function parseTimestamp(item: GraphDriveItem): number | undefined {
  const dt = item.photo?.takenDateTime ?? item.createdDateTime;
  if (!dt) return undefined;
  const ms = Date.parse(dt);
  return Number.isFinite(ms) ? ms : undefined;
}

/**
 * Extract a human-readable folder path from the Graph parentReference.
 * Graph returns paths like "/drive/root:/Bilder/Eigene Aufnahmen" — strip the prefix.
 */
function parseFolderPath(item: GraphDriveItem): string | undefined {
  const ref = item.parentReference?.path;
  if (!ref) return undefined;
  const marker = '/drive/root:';
  const idx = ref.indexOf(marker);
  const folder = idx === -1 ? ref : ref.slice(idx + marker.length);
  return folder || '/';
}

// ── Service ───────────────────────────────────────────────────────────────────

export class OneDriveImportService {
  constructor(private readonly authService: OneDriveAuthService) {}

  /**
   * Import all photos from a OneDrive folder into the local database.
   * Paginates through the folder, skips non-images and duplicates.
   * Recurses into subfolders when includeSubdirectories is true.
   * Calls onProgress after each item processed.
   */
  async importFolder(
    itemId: string,
    includeSubdirectories: boolean,
    onProgress: (progress: OneDriveImportProgress) => void,
    counts = { scanned: 0, imported: 0, duplicates: 0 },
    totals = { total: 0 }
  ): Promise<OneDriveImportResult> {
    // Fetch this folder's own childCount and add it to the running total.
    // This is a single lightweight item GET (not a children listing).
    const folderItem = await this.fetchItem(itemId);
    totals.total += folderItem.folder?.childCount ?? 0;

    let nextUrl: string | null = this.buildInitialUrl(itemId);
    const subfolderIds: string[] = [];

    while (nextUrl) {
      const page = await this.fetchPage(nextUrl);
      const items = Array.isArray(page.value) ? page.value : [];

      for (const item of items) {
        // Collect subfolders for later recursion
        if (item.folder && item.id && includeSubdirectories) {
          subfolderIds.push(item.id);
          continue;
        }

        if (!isImageItem(item) || !item.id || !item.name) continue;

        counts.scanned++;

        const sha256 = item.file?.hashes?.sha256Hash ?? null;
        const duplicate = isDuplicateOneDrivePhoto(sha256, item.id);

        if (duplicate) {
          counts.duplicates++;
        } else {
          createPhoto({
            source: 'onedrive',
            path: (parseFolderPath(item)?.replace(/\/$/, '') ?? '') + '/' + item.name,
            latitude: item.location?.latitude,
            longitude: item.location?.longitude,
            timestamp: parseTimestamp(item),
            fileSize: item.size ?? 0,
            mimeType: item.file?.mimeType ?? 'image/jpeg',
            cameraMake: item.photo?.cameraMake,
            cameraModel: item.photo?.cameraModel,
            cloudItemId: item.id,
            cloudFolderPath: parseFolderPath(item),
            cloudSha256: sha256 ?? undefined,
          });
          counts.imported++;
        }

        onProgress({ ...counts, total: totals.total, currentFile: item.name });
      }

      nextUrl = page['@odata.nextLink'] ?? null;
    }

    // Recurse into subfolders (shares same counts and totals objects so they accumulate)
    for (const subfolderId of subfolderIds) {
      await this.importFolder(subfolderId, true, onProgress, counts, totals);
    }

    return counts;
  }

  private buildInitialUrl(itemId: string): string {
    const url = new URL(
      `${ONEDRIVE_CONFIG.graphBaseUrl}/me/drive/items/${encodeURIComponent(itemId)}/children`
    );
    url.searchParams.set(
      '$select',
      'id,name,size,file,folder,photo,location,createdDateTime,parentReference'
    );
    url.searchParams.set('$top', '200');
    return url.toString();
  }

  private async fetchItem(itemId: string): Promise<GraphDriveItem> {
    const accessToken = await this.authService.getValidAccessToken();
    if (!accessToken) throw new Error('Cannot import from OneDrive: not connected');
    const url = `${ONEDRIVE_CONFIG.graphBaseUrl}/me/drive/items/${encodeURIComponent(itemId)}?$select=id,folder`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`OneDrive folder fetch failed (${response.status})`);
    return (await response.json()) as GraphDriveItem;
  }

  private async fetchPage(url: string): Promise<GraphItemsPage> {
    const accessToken = await this.authService.getValidAccessToken();
    if (!accessToken) {
      throw new Error('Cannot import from OneDrive: not connected');
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OneDrive photo listing failed (${response.status}): ${text}`);
    }

    return (await response.json()) as GraphItemsPage;
  }
}
