/**
 * Placemarks IPC handlers
 */

import { ipcMain } from 'electron';
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
}
