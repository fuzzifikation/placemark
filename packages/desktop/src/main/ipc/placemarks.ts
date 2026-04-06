/**
 * Placemarks IPC handlers
 */

import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { CreatePlacemarkInput, UpdatePlacemarkInput, PlacemarkBounds } from '@placemark/core';
import {
  getAllPlacemarks,
  createPlacemark,
  updatePlacemark,
  deletePlacemark,
  setPlacemarkGeoLabel,
  getPlacemarkPhotoCount,
  getThisYearPhotoCount,
  getLast3MonthsPhotoCount,
} from '../services/placemarks';

interface PlacemarkExportItem {
  name: string;
  bounds: PlacemarkBounds | null;
  dateStart: string | null;
  dateEnd: string | null;
}

interface PlacemarkExportFile {
  version: 1;
  exportedAt: string;
  placemarks: PlacemarkExportItem[];
}

function validateBounds(bounds: PlacemarkBounds): string | null {
  if (
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.east) ||
    !Number.isFinite(bounds.west)
  ) {
    return 'Bounds contain non-finite values';
  }
  if (bounds.north < bounds.south) return 'North must be >= south';
  return null;
}

function validatePlacemarkInput(input: {
  name?: string;
  bounds?: PlacemarkBounds | null;
  dateStart?: string | null;
  dateEnd?: string | null;
}): string | null {
  if ('name' in input && (typeof input.name !== 'string' || input.name.trim().length === 0)) {
    return 'Name must be a non-empty string';
  }
  if (input.bounds) {
    const boundsError = validateBounds(input.bounds);
    if (boundsError) return boundsError;
  }
  if (input.dateStart && input.dateEnd && input.dateStart > input.dateEnd) {
    return 'Start date must not be after end date';
  }
  return null;
}

export function registerPlacemarksHandlers(): void {
  ipcMain.handle('placemarks:getAll', () => {
    const placemarks = getAllPlacemarks();
    const smartCounts = {
      thisYear: getThisYearPhotoCount(),
      last3Months: getLast3MonthsPhotoCount(),
    };
    const placemarksWithCounts = placemarks.map((p) => ({
      ...p,
      photoCount: getPlacemarkPhotoCount(p),
    }));
    return { placemarks: placemarksWithCounts, smartCounts };
  });

  ipcMain.handle('placemarks:create', (_event, input: CreatePlacemarkInput) => {
    const error = validatePlacemarkInput(input);
    if (error) throw new Error(error);
    const placemark = createPlacemark(input);
    return { ...placemark, photoCount: getPlacemarkPhotoCount(placemark) };
  });

  ipcMain.handle('placemarks:update', (_event, input: UpdatePlacemarkInput) => {
    const error = validatePlacemarkInput(input);
    if (error) throw new Error(error);
    const placemark = updatePlacemark(input);
    return { ...placemark, photoCount: getPlacemarkPhotoCount(placemark) };
  });

  ipcMain.handle('placemarks:delete', (_event, id: number) => {
    deletePlacemark(id);
  });

  ipcMain.handle('placemarks:setGeoLabel', (_event, id: number, label: string) => {
    if (typeof label !== 'string' || label.trim().length === 0) return;
    setPlacemarkGeoLabel(id, label.trim());
  });

  ipcMain.handle('placemarks:exportToFile', async () => {
    const all = getAllPlacemarks().filter((p) => p.type === 'user');
    const data: PlacemarkExportFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      placemarks: all.map((p) => ({
        name: p.name,
        bounds: p.bounds,
        dateStart: p.dateStart,
        dateEnd: p.dateEnd,
      })),
    };

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Placemarks',
      defaultPath: path.join(app.getPath('documents'), 'placemarks.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (canceled || !filePath) return { exported: 0, canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { exported: all.length, canceled: false };
  });

  ipcMain.handle('placemarks:importFromFile', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Placemarks',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (canceled || filePaths.length === 0) return { imported: 0, skipped: 0, canceled: true };

    let raw: string;
    try {
      raw = fs.readFileSync(filePaths[0], 'utf8');
    } catch {
      throw new Error('Could not read file');
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON file');
    }

    if (
      !data ||
      typeof data !== 'object' ||
      (data as Record<string, unknown>).version !== 1 ||
      !Array.isArray((data as Record<string, unknown>).placemarks)
    ) {
      throw new Error('Invalid placemarks export file (unexpected format)');
    }

    const items = (data as PlacemarkExportFile).placemarks;
    const existingNames = new Set(getAllPlacemarks().map((p) => p.name.toLowerCase()));
    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
        skipped++;
        continue;
      }
      if (existingNames.has(item.name.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      const input: CreatePlacemarkInput = {
        name: item.name.trim(),
        bounds: item.bounds ?? null,
        dateStart: item.dateStart ?? null,
        dateEnd: item.dateEnd ?? null,
      };
      const error = validatePlacemarkInput(input);
      if (error) {
        skipped++;
        continue;
      }

      createPlacemark(input);
      existingNames.add(item.name.trim().toLowerCase());
      imported++;
    }

    return { imported, skipped, canceled: false };
  });
}
