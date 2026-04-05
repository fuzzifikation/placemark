/**
 * IPC handlers for export operations.
 * The renderer sends photo IDs; this handler queries the DB, formats the
 * content, shows the native save dialog, and writes the file.
 */

import { ipcMain, dialog } from 'electron';
import { promises as fs } from 'fs';
import { getPhotosByIds } from '../services/storage';
import { toCsv, toGeoJson, toGpx, getDateRange } from '@placemark/core';
import { logger } from '../services/logger';

type ExportFormat = 'csv' | 'geojson' | 'gpx';

interface ExportRequest {
  photoIds: number[];
  format: ExportFormat;
}

interface ExportResult {
  saved: boolean;
  filePath: string | null;
  count: number;
}

const EXTENSION: Record<ExportFormat, string> = {
  csv: 'csv',
  geojson: 'geojson',
  gpx: 'gpx',
};

const FILTER_NAME: Record<ExportFormat, string> = {
  csv: 'CSV Spreadsheet',
  geojson: 'GeoJSON',
  gpx: 'GPX Waypoints',
};

function defaultFilename(format: ExportFormat, photos: ReturnType<typeof getPhotosByIds>): string {
  const range = getDateRange(photos);
  // Use the oldest photo's date; fall back to today if no timestamps present
  const date = range
    ? new Date(range.start).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return `placemark-export-${date}.${EXTENSION[format]}`;
}

function formatContent(photos: ReturnType<typeof getPhotosByIds>, format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return toCsv(photos);
    case 'geojson':
      return toGeoJson(photos);
    case 'gpx':
      return toGpx(photos);
  }
}

export function registerExportHandlers(): void {
  ipcMain.handle(
    'export:saveFile',
    async (_event, { photoIds, format }: ExportRequest): Promise<ExportResult> => {
      const photos = getPhotosByIds(photoIds);

      const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: defaultFilename(format, photos),
        filters: [
          { name: FILTER_NAME[format], extensions: [EXTENSION[format]] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { saved: false, filePath: null, count: 0 };
      }

      const content = formatContent(photos, format);
      await fs.writeFile(filePath, content, 'utf-8');

      logger.info(`Exported ${photos.length} photos to ${filePath}`);
      return { saved: true, filePath, count: photos.length };
    }
  );
}
